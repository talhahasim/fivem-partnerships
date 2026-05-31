"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STORE_COOKIE } from "@/lib/stores";

/** Aktif mağazayı değiştirir (sahiplik doğrulanır). */
export async function setActiveStore(storeId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("id").eq("id", storeId).maybeSingle();
  if (!data) return; // RLS: sahip değilse görünmez

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STORE_COOKIE, storeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard");
}
