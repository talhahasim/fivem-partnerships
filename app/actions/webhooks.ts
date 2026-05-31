"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { encryptSecret } from "@/lib/crypto";
import { isValidWebhookUrl, validateWebhook, parseThreadId } from "@/lib/discord";

export type ActionState = { ok?: boolean; error?: string };

/** Webhook ekler: doğrular, AES-GCM (AAD=store_id) ile şifreler, kaydeder. */
export async function addWebhook(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { store } = await requireActiveStore();
  const label = String(formData.get("label") ?? "").trim() || "Webhook";
  const url = String(formData.get("url") ?? "").trim();
  const threadId = parseThreadId(String(formData.get("thread_id") ?? ""));

  if (!isValidWebhookUrl(url)) {
    return { error: "Invalid Discord webhook URL." };
  }

  const key = process.env.WEBHOOK_ENC_KEY;
  if (!key) return { error: "Server configuration missing (WEBHOOK_ENC_KEY)." };

  const meta = await validateWebhook(url);
  if (!meta) return { error: "Could not verify the webhook (deleted or unreachable)." };

  const url_encrypted = await encryptSecret(url, key, store.id);

  const supabase = await createClient();
  const { error } = await supabase.from("webhooks").insert({
    store_id: store.id,
    label,
    url_encrypted,
    thread_id: threadId,
    guild_name: meta.guild_id,
    channel_name: meta.name ?? meta.channel_id,
    is_valid: true,
    last_checked_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/webhooks");
  return { ok: true };
}

/** Var olan bir webhook'un forum post (thread_id) hedefini ayarlar/temizler. */
export async function updateWebhookThread(formData: FormData): Promise<void> {
  await requireActiveStore();
  const id = String(formData.get("id") ?? "");
  const threadId = parseThreadId(String(formData.get("thread_id") ?? ""));
  const supabase = await createClient();
  await supabase.from("webhooks").update({ thread_id: threadId }).eq("id", id); // RLS sahiplik garantisi
  revalidatePath("/dashboard/webhooks");
}

export async function deleteWebhook(formData: FormData): Promise<void> {
  await requireActiveStore();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("webhooks").delete().eq("id", id); // RLS sahiplik garantisi
  revalidatePath("/dashboard/webhooks");
}
