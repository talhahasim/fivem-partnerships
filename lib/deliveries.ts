import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscordMessage } from "@/lib/embed/schema";
import type { DeliverySource } from "@/lib/types/db";
import { enqueueDelivery } from "@/lib/queue";
import { notifyPendingDelivery } from "@/lib/notify";

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
    await enqueueDelivery(delivery.id);
  } else {
    await notifyPendingDelivery(admin, {
      recipientStoreId: p.recipientStoreId,
      senderName: p.senderName,
      deliveryId: delivery.id,
    });
  }

  return delivery.id;
}
