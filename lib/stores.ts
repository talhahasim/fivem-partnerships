import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Store } from "@/lib/types/db";

export const ACTIVE_STORE_COOKIE = "active_store";

/** Kullanıcının sahip olduğu tüm mağazalar (en yeni önce). */
export async function getStores(): Promise<Store[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Store[];
}

/**
 * Aktif mağazayı çözer: cookie'deki store_id sahip olunanlar arasındaysa onu,
 * değilse ilk mağazayı döndürür. Hiç mağaza yoksa null.
 */
export async function getActiveStore(): Promise<{ store: Store | null; stores: Store[] }> {
  const stores = await getStores();
  if (stores.length === 0) return { store: null, stores };

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;
  const matched = stores.find((s) => s.id === activeId);
  return { store: matched ?? stores[0], stores };
}

/** Aktif mağazayı döndürür; yoksa onboarding'e yönlendirilmesi çağıran katmanın işi. */
export async function requireActiveStore(): Promise<{ store: Store; stores: Store[] }> {
  const { store, stores } = await getActiveStore();
  if (!store) {
    // Çağıran sayfa onboarding redirect yapmalı; burada güvenli hata.
    throw new Error("NO_ACTIVE_STORE");
  }
  return { store, stores };
}
