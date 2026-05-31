"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { requireActiveStore } from "@/lib/stores";
import { dispatchDelivery } from "@/lib/deliveries";
import { parseThreadId, isValidWebhookUrl, validateWebhook } from "@/lib/discord";
import { encryptSecret } from "@/lib/crypto";
import { defaultIntroMessage } from "@/lib/embed/defaults";
import { messageSchema, type DiscordMessage } from "@/lib/embed/schema";
import type { Store } from "@/lib/types/db";

export type CreateInviteState = { link?: string; error?: string };

/** Davet linki oluşturur (inviter tarafı). */
export async function createInvite(
  _prev: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const { store } = await requireActiveStore();
  const webhookId = String(formData.get("webhook_id") ?? "") || null;
  const templateId = String(formData.get("template_id") ?? "") || null;
  const inviterThreadId = parseThreadId(String(formData.get("thread_id") ?? ""));

  if (!webhookId) return { error: "Select the channel (webhook) that receives your partner's message." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .insert({
      inviter_store_id: store.id,
      inviter_webhook_id: webhookId,
      inviter_intro_template_id: templateId,
      inviter_thread_id: inviterThreadId,
      status: "pending",
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 gün
    })
    .select("token")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create the invite" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { link: `${appUrl}/invite/${data.token}` };
}

/** Daveti kabul eder (invitee tarafı). İki yönlü intro delivery üretir. */
export async function acceptInvite(formData: FormData): Promise<void> {
  await requireUser();
  const { store: inviteeStore } = await requireActiveStore();

  const token = String(formData.get("token") ?? "");
  const inviteeWebhookId = String(formData.get("webhook_id") ?? "") || null;
  const inviteeTemplateId = String(formData.get("template_id") ?? "") || null;
  const inviteeThreadId = parseThreadId(String(formData.get("thread_id") ?? ""));
  if (!token || !inviteeWebhookId) throw new Error("Missing information");

  const admin = createAdminClient();

  // Davet
  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!invite || invite.status !== "pending") throw new Error("Invite is invalid or already used");
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    await admin.from("invites").update({ status: "expired" }).eq("id", invite.id);
    throw new Error("Invite has expired");
  }
  if (invite.inviter_store_id === inviteeStore.id) throw new Error("You can't partner with yourself");

  // Zaten partnerlik var mı?
  const { data: existing } = await admin
    .from("partnerships")
    .select("id")
    .or(
      `and(inviter_store_id.eq.${invite.inviter_store_id},invitee_store_id.eq.${inviteeStore.id}),` +
        `and(inviter_store_id.eq.${inviteeStore.id},invitee_store_id.eq.${invite.inviter_store_id})`,
    )
    .maybeSingle();
  if (existing) throw new Error("You already have a partnership with this store");

  // Invitee webhook sahiplik doğrulaması
  const { data: inviteeWebhook } = await admin
    .from("webhooks")
    .select("id")
    .eq("id", inviteeWebhookId)
    .eq("store_id", inviteeStore.id)
    .maybeSingle();
  if (!inviteeWebhook) throw new Error("Invalid webhook selection");

  // Mağaza isimleri
  const { data: inviterStore } = await admin
    .from("stores")
    .select("id,name")
    .eq("id", invite.inviter_store_id)
    .single<Pick<Store, "id" | "name">>();

  // Intro payload'ları
  const inviterIntro = await loadTemplatePayload(
    admin,
    invite.inviter_intro_template_id,
    invite.inviter_store_id,
    inviterStore?.name ?? "Partner",
  );
  const inviteeIntro = await loadTemplatePayload(
    admin,
    inviteeTemplateId,
    inviteeStore.id,
    inviteeStore.name,
  );

  // Partnerlik
  const { data: partnership, error: pErr } = await admin
    .from("partnerships")
    .insert({
      inviter_store_id: invite.inviter_store_id,
      invitee_store_id: inviteeStore.id,
      status: "accepted",
      inviter_webhook_id: invite.inviter_webhook_id,
      invitee_webhook_id: inviteeWebhookId,
      inviter_thread_id: invite.inviter_thread_id,
      invitee_thread_id: inviteeThreadId,
      inviter_intro_payload: inviterIntro,
      invitee_intro_payload: inviteeIntro,
    })
    .select("id")
    .single();
  if (pErr || !partnership) throw new Error(pErr?.message ?? "Could not create the partnership");

  await admin
    .from("invites")
    .update({ status: "accepted", used_at: new Date().toISOString() })
    .eq("id", invite.id);

  // İki yönlü intro: inviter mesajı invitee kanalına, invitee mesajı inviter kanalına
  if (invite.inviter_webhook_id) {
    await dispatchDelivery(admin, {
      senderStoreId: inviteeStore.id,
      senderName: inviteeStore.name,
      recipientStoreId: invite.inviter_store_id,
      partnershipId: partnership.id,
      webhookId: invite.inviter_webhook_id,
      threadId: invite.inviter_thread_id,
      sourceType: "intro",
      sourceId: partnership.id,
      payload: inviteeIntro,
    });
  }
  await dispatchDelivery(admin, {
    senderStoreId: invite.inviter_store_id,
    senderName: inviterStore?.name ?? "Partner",
    recipientStoreId: inviteeStore.id,
    partnershipId: partnership.id,
    webhookId: inviteeWebhookId,
    threadId: inviteeThreadId,
    sourceType: "intro",
    sourceId: partnership.id,
    payload: inviterIntro,
  });

  revalidatePath("/dashboard/partnerships");
  redirect("/dashboard/partnerships");
}

/**
 * Daveti MİSAFİR olarak kabul eder (kayıt/login gerekmez).
 * Davetli kendi webhook URL'ini doğrudan girer; sisteme kayıtlı olması gerekmez.
 * Arka planda hafif bir "guest store" + webhook satırı açılır, böylece mevcut
 * delivery/worker zinciri (FK + AES-GCM AAD=store_id) hiç değişmeden çalışır.
 */
export async function acceptInviteGuest(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const storeName = String(formData.get("store_name") ?? "").trim();
  const webhookUrl = String(formData.get("webhook_url") ?? "").trim();
  const threadId = parseThreadId(String(formData.get("thread_id") ?? ""));
  const messageText = String(formData.get("message") ?? "").trim();

  if (!token) throw new Error("Missing invite");
  if (!storeName) throw new Error("Enter your store / server name.");
  if (!isValidWebhookUrl(webhookUrl)) throw new Error("Invalid Discord webhook URL.");

  const key = process.env.WEBHOOK_ENC_KEY;
  if (!key) throw new Error("Server configuration missing (WEBHOOK_ENC_KEY).");

  const admin = createAdminClient();

  // Davet doğrula
  const { data: invite } = await admin.from("invites").select("*").eq("token", token).maybeSingle();
  if (!invite || invite.status !== "pending") throw new Error("Invite is invalid or already used");
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    await admin.from("invites").update({ status: "expired" }).eq("id", invite.id);
    throw new Error("Invite has expired");
  }

  // Webhook gerçekten var mı? (kaydetmeden önce doğrula)
  const meta = await validateWebhook(webhookUrl);
  if (!meta) throw new Error("Could not verify the webhook (deleted or unreachable).");

  const { data: inviterStore } = await admin
    .from("stores")
    .select("id,name")
    .eq("id", invite.inviter_store_id)
    .single<Pick<Store, "id" | "name">>();

  // Hafif guest store (owner_id null, is_guest)
  const slug = `guest-${crypto.randomUUID().slice(0, 12)}`;
  const { data: guestStore, error: gErr } = await admin
    .from("stores")
    .insert({ name: storeName, slug, is_guest: true })
    .select("id,name")
    .single<Pick<Store, "id" | "name">>();
  if (gErr || !guestStore) throw new Error(gErr?.message ?? "Could not create the partnership");

  // Guest'in onaylayacak paneli yok; kabul anında zaten rıza verdi → gelen
  // partner gönderimleri otomatik onaylansın (yoksa 'manual' default → sonsuz pending).
  await admin.from("store_settings").insert({ store_id: guestStore.id, approval_mode: "auto" });

  // Guest webhook (AAD = guest store id → worker bununla decrypt eder)
  const url_encrypted = await encryptSecret(webhookUrl, key, guestStore.id);
  const { data: guestWebhook, error: wErr } = await admin
    .from("webhooks")
    .insert({
      store_id: guestStore.id,
      label: "Partner channel",
      url_encrypted,
      thread_id: threadId,
      guild_name: meta.guild_id,
      channel_name: meta.name ?? meta.channel_id,
      is_valid: true,
      last_checked_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (wErr || !guestWebhook) throw new Error(wErr?.message ?? "Could not save the webhook");

  const inviterIntro = await loadTemplatePayload(
    admin,
    invite.inviter_intro_template_id,
    invite.inviter_store_id,
    inviterStore?.name ?? "Partner",
  );
  const inviteeIntro: DiscordMessage = messageText
    ? { content: messageText }
    : defaultIntroMessage(guestStore.name);

  const { data: partnership, error: pErr } = await admin
    .from("partnerships")
    .insert({
      inviter_store_id: invite.inviter_store_id,
      invitee_store_id: guestStore.id,
      status: "accepted",
      inviter_webhook_id: invite.inviter_webhook_id,
      invitee_webhook_id: guestWebhook.id,
      inviter_thread_id: invite.inviter_thread_id,
      invitee_thread_id: threadId,
      inviter_intro_payload: inviterIntro,
      invitee_intro_payload: inviteeIntro,
    })
    .select("id")
    .single();
  if (pErr || !partnership) throw new Error(pErr?.message ?? "Could not create the partnership");

  await admin
    .from("invites")
    .update({ status: "accepted", used_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Guest'in mesajı → inviter kanalına (inviter'ın onay moduna saygı gösterir)
  if (invite.inviter_webhook_id) {
    await dispatchDelivery(admin, {
      senderStoreId: guestStore.id,
      senderName: guestStore.name,
      recipientStoreId: invite.inviter_store_id,
      partnershipId: partnership.id,
      webhookId: invite.inviter_webhook_id,
      threadId: invite.inviter_thread_id,
      sourceType: "intro",
      sourceId: partnership.id,
      payload: inviteeIntro,
    });
  }
  // Inviter'ın mesajı → guest kanalına. Guest'in paneli/onaycısı yok → forceApproved.
  await dispatchDelivery(admin, {
    senderStoreId: invite.inviter_store_id,
    senderName: inviterStore?.name ?? "Partner",
    recipientStoreId: guestStore.id,
    partnershipId: partnership.id,
    webhookId: guestWebhook.id,
    threadId,
    sourceType: "intro",
    sourceId: partnership.id,
    payload: inviterIntro,
    forceApproved: true,
  });

  redirect("/invite/accepted");
}

async function loadTemplatePayload(
  admin: ReturnType<typeof createAdminClient>,
  templateId: string | null,
  storeId: string,
  storeName: string,
): Promise<DiscordMessage> {
  if (templateId) {
    const { data } = await admin
      .from("templates")
      .select("payload_json")
      .eq("id", templateId)
      .eq("store_id", storeId)
      .maybeSingle();
    const parsed = messageSchema.safeParse(data?.payload_json);
    if (parsed.success) return parsed.data;
  }
  return defaultIntroMessage(storeName);
}
