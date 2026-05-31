"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { enqueueDelivery } from "@/lib/queue";

/** Bekleyen bir delivery'yi onaylar (yalnız alıcı). 'approved' → Queue. */
export async function approveDelivery(formData: FormData): Promise<void> {
  const { store } = await requireActiveStore();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data } = await supabase
    .from("deliveries")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_store_id", store.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (data) await enqueueDelivery(data.id);
  revalidatePath("/dashboard/inbox");
}

export async function rejectDelivery(formData: FormData): Promise<void> {
  const { store } = await requireActiveStore();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("deliveries")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("recipient_store_id", store.id)
    .eq("status", "pending");
  revalidatePath("/dashboard/inbox");
}
