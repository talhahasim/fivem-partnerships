"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { messageSchema, type DiscordMessage } from "@/lib/embed/schema";
import { decryptSecret } from "@/lib/crypto";
import { parseMessageLink, fetchWebhookMessage } from "@/lib/discord";
import type { TemplateType } from "@/lib/types/db";

const TYPES: TemplateType[] = ["partnership_intro", "product", "custom"];

export async function saveTemplate(formData: FormData): Promise<void> {
  const { store } = await requireActiveStore();
  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "custom");
  const type: TemplateType = TYPES.includes(typeRaw as TemplateType) ? (typeRaw as TemplateType) : "custom";

  if (!name) throw new Error("Template name is required");

  let payload;
  try {
    payload = messageSchema.parse(JSON.parse(String(formData.get("payload") ?? "{}")));
  } catch {
    throw new Error("Invalid message content");
  }

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("templates")
      .update({ name, type, payload_json: payload })
      .eq("id", id)
      .eq("store_id", store.id);
    if (error) throw new Error(`Could not update template: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("templates")
      .insert({ store_id: store.id, name, type, payload_json: payload });
    if (error) throw new Error(`Could not create template: ${error.message}`);
  }

  revalidatePath("/dashboard/templates");
  redirect("/dashboard/templates");
}

/**
 * Discord mesaj linkinden şablon içeriği çeker. Mağazanın webhook'larını sırayla dener;
 * mesajı GÖNDEREN webhook bulunursa içeriğini DiscordMessage olarak döndürür.
 */
export async function importFromMessageLink(
  link: string,
): Promise<{ message?: DiscordMessage; error?: string }> {
  const { store } = await requireActiveStore();
  const parsed = parseMessageLink(link);
  if (!parsed) return { error: "Enter a valid Discord message link." };

  const key = process.env.WEBHOOK_ENC_KEY;
  if (!key) return { error: "Server configuration missing (WEBHOOK_ENC_KEY)." };

  const supabase = await createClient();
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url_encrypted")
    .eq("store_id", store.id)
    .limit(50);

  if (!webhooks || webhooks.length === 0) {
    return { error: "Add a webhook first." };
  }

  for (const w of webhooks) {
    let url: string;
    try {
      url = await decryptSecret(w.url_encrypted, key, store.id);
    } catch {
      continue;
    }
    const msg = await fetchWebhookMessage(url, parsed.messageId);
    if (!msg) continue;

    const candidate = {
      content: typeof msg.content === "string" ? msg.content || undefined : undefined,
      embeds: Array.isArray(msg.embeds) ? msg.embeds : undefined,
    };
    const result = messageSchema.safeParse(candidate);
    if (result.success) return { message: result.data };
    return { error: "Message fetched but its content could not be converted." };
  }

  return {
    error: "Message not found. You can only import messages sent by your own webhooks.",
  };
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  await requireActiveStore();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("templates").delete().eq("id", id);
  revalidatePath("/dashboard/templates");
}
