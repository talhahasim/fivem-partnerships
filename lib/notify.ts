import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/crypto";
import { sendWebhookMessage } from "@/lib/discord";

/**
 * Bekleyen (pending) bir delivery için alıcıya bildirim üretir:
 *  - site içi notification kaydı
 *  - notify_mode='channel' ise belirlenen webhook kanalına Discord mesajı
 */
export async function notifyPendingDelivery(
  admin: SupabaseClient,
  opts: { recipientStoreId: string; senderName: string; deliveryId: string },
): Promise<void> {
  const { recipientStoreId, senderName, deliveryId } = opts;

  // Site içi çan
  await admin.from("notifications").insert({
    store_id: recipientStoreId,
    type: "delivery_pending",
    data_json: { delivery_id: deliveryId, sender_name: senderName },
  });

  // Kanal bildirimi (opsiyonel)
  const { data: settings } = await admin
    .from("store_settings")
    .select("notify_mode, notify_webhook_id")
    .eq("store_id", recipientStoreId)
    .maybeSingle();

  if (!settings || settings.notify_mode !== "channel" || !settings.notify_webhook_id) return;

  const { data: webhook } = await admin
    .from("webhooks")
    .select("url_encrypted, store_id, thread_id")
    .eq("id", settings.notify_webhook_id)
    .maybeSingle();
  if (!webhook) return;

  const key = process.env.WEBHOOK_ENC_KEY;
  if (!key) return;

  let url: string;
  try {
    url = await decryptSecret(webhook.url_encrypted, key, webhook.store_id);
  } catch {
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await sendWebhookMessage(
    url,
    {
      embeds: [
        {
          title: "📥 Pending partnership message",
          description: `**${senderName}** wants to post a message to your channel. Open the dashboard to approve it.`,
          color: 0x5865f2,
          url: appUrl ? `${appUrl}/dashboard/inbox` : undefined,
        },
      ],
    },
    webhook.thread_id,
  );
}
