"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";

export async function revokePartnership(formData: FormData): Promise<void> {
  const { store } = await requireActiveStore();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  // RLS: yalnız taraflardan biri güncelleyebilir
  await supabase
    .from("partnerships")
    .update({ status: "revoked" })
    .eq("id", id)
    .or(`inviter_store_id.eq.${store.id},invitee_store_id.eq.${store.id}`);
  revalidatePath("/dashboard/partnerships");
}
