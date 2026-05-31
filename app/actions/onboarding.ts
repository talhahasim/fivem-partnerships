"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { requireActiveStore, ACTIVE_STORE_COOKIE } from "@/lib/stores";
import { defaultIntroMessage } from "@/lib/embed/defaults";
import { messageSchema } from "@/lib/embed/schema";

export type OnboardingState = { ok?: boolean; error?: string };

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base || "store"}-${suffix}`;
}

/**
 * Onboarding 1. adım: mağaza oluştur. createStore ile aynı; ama REDIRECT etmez,
 * state döner ki client wizard sonraki adıma kaysın. Aktif mağaza cookie'si set edilir.
 */
export async function obCreateStore(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Store name is required." };

  const supabase = await createClient();
  const { data: store, error } = await supabase
    .from("stores")
    .insert({ owner_id: user.id, name, slug: slugify(name) })
    .select("id")
    .single();
  if (error || !store) return { error: error?.message ?? "Could not create the store." };

  const { data: template } = await supabase
    .from("templates")
    .insert({
      store_id: store.id,
      name: "Default Partnership Message",
      type: "partnership_intro",
      payload_json: defaultIntroMessage(name),
    })
    .select("id")
    .single();

  await supabase.from("store_settings").insert({
    store_id: store.id,
    approval_mode: "manual",
    notify_mode: "channel",
    default_intro_template_id: template?.id ?? null,
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STORE_COOKIE, store.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true };
}

/** Onboarding template adımı: embed editöründen gelen payload'ı partnership_intro şablonu olarak kaydeder. */
export async function obCreateTemplate(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { store } = await requireActiveStore();

  let payload;
  try {
    payload = messageSchema.parse(JSON.parse(String(formData.get("payload") ?? "{}")));
  } catch {
    return { error: "Invalid message content." };
  }
  if (!payload.embeds?.length && !payload.content?.trim()) {
    return { error: "Add a title, description, or some content to your message." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("templates").insert({
    store_id: store.id,
    name: "Partnership Intro",
    type: "partnership_intro",
    payload_json: payload,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/templates");
  return { ok: true };
}
