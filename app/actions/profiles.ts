"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";

export type ProfileState = { ok?: boolean; error?: string };

/** Yeni gönderen profili ekler (webhook adı + avatar). */
export async function addProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { store } = await requireActiveStore();
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim() || null;
  const avatar_url = String(formData.get("avatar_url") ?? "").trim() || null;
  const makeDefault = formData.get("is_default") === "on";

  if (!name) return { error: "Profile name is required." };
  if (!username && !avatar_url) return { error: "Set a username and/or avatar." };

  const supabase = await createClient();

  // İlk profil otomatik varsayılan olsun
  const { count } = await supabase
    .from("sender_profiles")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id);
  const isDefault = makeDefault || (count ?? 0) === 0;

  if (isDefault) {
    await supabase.from("sender_profiles").update({ is_default: false }).eq("store_id", store.id);
  }

  const { error } = await supabase.from("sender_profiles").insert({
    store_id: store.id,
    name,
    username,
    avatar_url,
    is_default: isDefault,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/profiles");
  return { ok: true };
}

export async function deleteProfile(formData: FormData): Promise<void> {
  await requireActiveStore();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("sender_profiles").delete().eq("id", id);
  revalidatePath("/dashboard/profiles");
}

export async function setDefaultProfile(formData: FormData): Promise<void> {
  const { store } = await requireActiveStore();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("sender_profiles").update({ is_default: false }).eq("store_id", store.id);
  await supabase
    .from("sender_profiles")
    .update({ is_default: true })
    .eq("id", id)
    .eq("store_id", store.id);
  revalidatePath("/dashboard/profiles");
}
