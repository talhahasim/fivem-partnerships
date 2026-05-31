import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscordMessage } from "@/lib/embed/schema";
import type { DeliverySource } from "@/lib/types/db";
import { enqueueDelivery } from "@/lib/queue";
import { notifyPendingDelivery } from "@/lib/notify";
import { decryptSecret } from "@/lib/crypto";
import { sendWebhookMessage } from "@/lib/discord";

export type DispatchParams = {
  senderStoreId: string;
  senderName: string;
  recipientStoreId: string;
  partnershipId: string | null;
  webhookId: string; // ALICININ webhook'u (mesajın düşeceği kanal)
  threadId?: string | null; // forum/post kanalı için mevcut post (varsa)
  sourceType: DeliverySource;
  sourceId: string | null;
  payload: DiscordMessage;
  forceApproved?: boolean; // kendi kanalına gönderim → onay aranmaz
};

/**
 * Bir delivery oluşturur ve alıcının onay ayarına göre yönlendirir:
 *  - auto   → status 'approved', Queue'ya basılır (cron yedek)
 *  - manual → status 'pending', alıcıya bildirim gönderilir
 *
 * admin = service-role istemci (RLS bypass). Çağıran, gönderenin yetkisini ÖNCEDEN doğrulamış olmalı.
 */
export async function dispatchDelivery(admin: SupabaseClient, p: DispatchParams): Promise<string | null> {
  let mode: "auto" | "manual";
  if (p.forceApproved) {
    mode = "auto";
  } else {
    const { data: settings } = await admin
      .from("store_settings")
      .select("approval_mode")
      .eq("store_id", p.recipientStoreId)
      .maybeSingle();
    mode = settings?.approval_mode ?? "manual";
  }
  const status = mode === "auto" ? "approved" : "pending";

  const { data: delivery, error } = await admin
    .from("deliveries")
    .insert({
      sender_store_id: p.senderStoreId,
      recipient_store_id: p.recipientStoreId,
      partnership_id: p.partnershipId,
      webhook_id: p.webhookId,
      thread_id: p.threadId ?? null,
      source_type: p.sourceType,
      source_id: p.sourceId,
      payload_json: p.payload,
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !delivery) return null;

  if (status === "approved") {
    if (shouldDeliverInline()) {
      // Test/dev: queue'ya HİÇ gitme, worker'ı bekleme → doğrudan gönder.
      // (next dev'de OpenNext queue binding'i var ama tüketen worker yok;
      //  enqueue 'başarılı' görünüp delivery sonsuza dek 'approved' kalırdı.)
      await deliverInline(admin, delivery.id);
    } else {
      const queued = await enqueueDelivery(delivery.id);
      // Güvenlik ağı: binding gerçekten yoksa yine inline gönder.
      if (!queued) await deliverInline(admin, delivery.id);
    }
  } else {
    await notifyPendingDelivery(admin, {
      recipientStoreId: p.recipientStoreId,
      senderName: p.senderName,
      deliveryId: delivery.id,
    });
  }

  return delivery.id;
}

/**
 * Test/dev'de gönderimi worker yerine doğrudan (inline) yapsın mı?
 * - DELIVERY_INLINE=1  → her ortamda zorla inline
 * - NODE_ENV !== "production"  → `next dev`/test otomatik inline
 * Production (Cloudflare) → false: queue + worker devrede kalır.
 */
function shouldDeliverInline(): boolean {
  return process.env.DELIVERY_INLINE === "1" || process.env.NODE_ENV !== "production";
}

/**
 * Tek bir 'approved' delivery'yi worker olmadan (lokal/dev) doğrudan gönderir.
 * Worker'daki processDelivery ile aynı mantık: atomik claim → decrypt → gönder → durum.
 * Cloudflare Queue mevcutsa bu yol HİÇ çalışmaz (enqueue başarılı olur).
 */
export async function deliverInline(admin: SupabaseClient, deliveryId: string): Promise<void> {
  const key = process.env.WEBHOOK_ENC_KEY;
  if (!key) return;

  // ATOMIK CLAIM: yalnız 'approved' → 'sending' (çift gönderim koruması)
  const { data: delivery } = await admin
    .from("deliveries")
    .update({ status: "sending" })
    .eq("id", deliveryId)
    .eq("status", "approved")
    .select("id, attempts, payload_json, webhook_id, thread_id")
    .maybeSingle();
  if (!delivery) return;

  const { data: webhook } = await admin
    .from("webhooks")
    .select("id, url_encrypted, store_id, thread_id")
    .eq("id", delivery.webhook_id)
    .single();
  if (!webhook) {
    await admin
      .from("deliveries")
      .update({ status: "failed", error: "webhook_not_found" })
      .eq("id", deliveryId);
    return;
  }

  let url: string;
  try {
    url = await decryptSecret(webhook.url_encrypted, key, webhook.store_id);
  } catch {
    await admin
      .from("deliveries")
      .update({ status: "failed", error: "decrypt_failed" })
      .eq("id", deliveryId);
    return;
  }

  const threadId = delivery.thread_id ?? webhook.thread_id ?? undefined;
  const result = await sendWebhookMessage(
    url,
    delivery.payload_json as Record<string, unknown>,
    threadId,
  );
  const attempts = (delivery.attempts ?? 0) + 1;

  if (result.ok) {
    await admin
      .from("deliveries")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        discord_message_id: result.messageId,
        attempts,
        error: null,
      })
      .eq("id", deliveryId);
  } else {
    // Dev'de retry döngüsü yok: kalıcı hata → failed, geçici → tekrar 'approved'.
    await admin
      .from("deliveries")
      .update({ status: result.retryable ? "approved" : "failed", attempts, error: result.error })
      .eq("id", deliveryId);
  }
}
