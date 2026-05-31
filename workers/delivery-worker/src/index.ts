/**
 * Delivery Worker — Cloudflare Queue consumer + Cron sweeper.
 *
 * queue():  Kuyruktaki { deliveryId } mesajlarını işler → webhook URL'i decrypt edip Discord'a gönderir.
 * scheduled(): 1 dakikada bir 'approved' (ve retry bekleyen) delivery'leri tekrar kuyruğa basar (güvenlik ağı).
 *
 * Bu worker ana Next.js uygulamasından AYRI deploy edilir.
 * Gizli anahtarlar: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_ENC_KEY.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "../../../lib/crypto";
import { sendWebhookMessage } from "../../../lib/discord";

type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WEBHOOK_ENC_KEY: string;
  DELIVERY_QUEUE: Queue<DeliveryMessage>;
};

type DeliveryMessage = { deliveryId: string };

function db(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const MAX_ATTEMPTS = 5;

/** Tek bir delivery'yi işler. Tekrar denenebilir hata → throw (Queue retry eder). */
async function processDelivery(env: Env, deliveryId: string): Promise<void> {
  const supabase = db(env);

  // ATOMIK CLAIM: yalnızca 'approved' → 'sending'. Eşzamanlı/çift teslimde
  // ikinci işleyici hiçbir satır alamaz ve çıkar (çift gönderim koruması).
  const { data: delivery } = await supabase
    .from("deliveries")
    .update({ status: "sending" })
    .eq("id", deliveryId)
    .eq("status", "approved")
    .select("id, attempts, payload_json, webhook_id, thread_id")
    .maybeSingle();

  if (!delivery) return; // approved değil / başka işleyici kaptı / zaten gönderildi

  const { data: webhook } = await supabase
    .from("webhooks")
    .select("id, url_encrypted, store_id, thread_id")
    .eq("id", delivery.webhook_id)
    .single();

  if (!webhook) {
    await supabase
      .from("deliveries")
      .update({ status: "failed", error: "webhook_not_found" })
      .eq("id", deliveryId);
    return;
  }

  // AAD = webhook'un sahibi store_id (ciphertext-swap korumasıyla uyumlu)
  const url = await decryptSecret(webhook.url_encrypted, env.WEBHOOK_ENC_KEY, webhook.store_id);
  // Partnerlik thread'i öncelikli; yoksa webhook'un varsayılan thread'i
  const threadId = delivery.thread_id ?? webhook.thread_id ?? undefined;
  const result = await sendWebhookMessage(url, delivery.payload_json, threadId);
  const attempts = (delivery.attempts ?? 0) + 1;

  if (result.ok) {
    await supabase
      .from("deliveries")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        discord_message_id: result.messageId,
        attempts,
        error: null,
      })
      .eq("id", deliveryId);
    return;
  }

  // Kalıcı hata veya deneme limiti aşıldı → failed
  if (!result.retryable || attempts >= MAX_ATTEMPTS) {
    await supabase
      .from("deliveries")
      .update({ status: "failed", error: result.error, attempts })
      .eq("id", deliveryId);
    return;
  }

  // Tekrar denenebilir → 'approved'a geri bırak (claim serbest) ve throw et → Queue yeniden dener
  await supabase
    .from("deliveries")
    .update({ status: "approved", attempts, error: result.error })
    .eq("id", deliveryId);
  throw new Error(`retryable: ${result.error}`);
}

export default {
  async queue(batch: MessageBatch<DeliveryMessage>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await processDelivery(env, msg.body.deliveryId);
        msg.ack();
      } catch {
        msg.retry();
      }
    }
  },

  // Sweeper: 2 dk'dan eski takılmış 'sending' kayıtları kurtar, sonra tüm
  // 'approved' kayıtları tekrar enqueue et (kuyruğa hiç girmemiş olanlar dahil).
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const supabase = db(env);

    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    await supabase
      .from("deliveries")
      .update({ status: "approved" })
      .eq("status", "sending")
      .lt("updated_at", cutoff);

    const { data: stuck } = await supabase
      .from("deliveries")
      .select("id")
      .eq("status", "approved")
      .lt("attempts", MAX_ATTEMPTS)
      .limit(100);

    for (const d of stuck ?? []) {
      await env.DELIVERY_QUEUE.send({ deliveryId: d.id });
    }
  },
};
