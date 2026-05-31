"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { ACTIVE_STORE_COOKIE } from "@/lib/stores";
import { defaultIntroMessage } from "@/lib/embed/defaults";

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

export async function createStore(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const logo_url = String(formData.get("logo_url") ?? "").trim() || null;

  if (!name) throw new Error("Store name is required");

  const supabase = await createClient();

  const { data: store, error } = await supabase
    .from("stores")
    .insert({ owner_id: user.id, name, slug: slugify(name), description, logo_url })
    .select("id")
    .single();
  if (error || !store) throw new Error(error?.message ?? "Could not create the store");

  // Varsayılan partnerlik intro şablonu
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

  // Mağaza ayarları
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

  redirect("/dashboard");
}
