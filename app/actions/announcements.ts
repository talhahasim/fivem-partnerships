"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStore } from "@/lib/stores";
import { dispatchDelivery } from "@/lib/deliveries";
import { messageSchema } from "@/lib/embed/schema";
import type { AnnounceTarget, Partnership } from "@/lib/types/db";

export async function createAndBroadcast(formData: FormData): Promise<void> {
  const { store } = await requireActiveStore();
  const title = String(formData.get("title") ?? "").trim() || "Announcement";
  const rawTarget = String(formData.get("target"));
  const target: AnnounceTarget =
    rawTarget === "selected" ? "selected" : rawTarget === "own" ? "own" : "all";
  const selectedIds = formData.getAll("partnership_ids").map(String);
  const ownWebhookIds = formData.getAll("own_webhook_ids").map(String);

  // "own" hedefinde partnerlere gönderim yok; o yüzden en az bir kendi kanalı şart.
  if (target === "own" && ownWebhookIds.length === 0) {
    throw new Error("Select at least one of your own channels.");
  }

  let payload;
  try {
    payload = messageSchema.parse(JSON.parse(String(formData.get("payload") ?? "{}")));
  } catch {
    throw new Error("Invalid message content");
  }

  const supabase = await createClient();

  const { data: announcement } = await supabase
    .from("announcements")
    .insert({ store_id: store.id, title, payload_json: payload, target })
    .select("id")
    .single();

  // Aktif partnerlikler (RLS: yalnız taraf olduklarım)
  const { data: partnerships } = await supabase
    .from("partnerships")
    .select("*")
    .or(`inviter_store_id.eq.${store.id},invitee_store_id.eq.${store.id}`)
    .eq("status", "accepted");

  let list = (partnerships ?? []) as Partnership[];
  if (target === "own") list = [];
  else if (target === "selected") list = list.filter((p) => selectedIds.includes(p.id));

  const admin = createAdminClient();
  for (const p of list) {
    const isInviter = p.inviter_store_id === store.id;
    const recipientStoreId = isInviter ? p.invitee_store_id : p.inviter_store_id;
    const webhookId = isInviter ? p.invitee_webhook_id : p.inviter_webhook_id;
    const threadId = isInviter ? p.invitee_thread_id : p.inviter_thread_id;
    if (!webhookId) continue;

    await dispatchDelivery(admin, {
      senderStoreId: store.id,
      senderName: store.name,
      recipientStoreId,
      partnershipId: p.id,
      webhookId,
      threadId,
      sourceType: "announcement",
      sourceId: announcement?.id ?? null,
      payload,
    });
  }

  // Kendi webhook'larına doğrudan gönderim (partner dışı). Onay aranmaz.
  if (ownWebhookIds.length > 0) {
    const { data: ownWebhooks } = await supabase
      .from("webhooks")
      .select("id")
      .eq("store_id", store.id)
      .in("id", ownWebhookIds);

    for (const w of ownWebhooks ?? []) {
      await dispatchDelivery(admin, {
        senderStoreId: store.id,
        senderName: store.name,
        recipientStoreId: store.id, // kendine
        partnershipId: null,
        webhookId: w.id,
        sourceType: "announcement",
        sourceId: announcement?.id ?? null,
        payload,
        forceApproved: true,
      });
    }
  }

  revalidatePath("/dashboard/announcements");
  redirect("/dashboard/announcements");
}
