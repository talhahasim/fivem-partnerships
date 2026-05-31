"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import type { ApprovalMode, NotifyMode } from "@/lib/types/db";

export async function updateSettings(formData: FormData): Promise<void> {
  const { store } = await requireActiveStore();

  const approval_mode: ApprovalMode =
    String(formData.get("approval_mode")) === "auto" ? "auto" : "manual";
  const notify_mode: NotifyMode = String(formData.get("notify_mode")) === "channel" ? "channel" : "none";
  const notify_webhook_id = String(formData.get("notify_webhook_id") ?? "") || null;
  const default_intro_template_id = String(formData.get("default_intro_template_id") ?? "") || null;

  const supabase = await createClient();
  await supabase
    .from("store_settings")
    .upsert(
      { store_id: store.id, approval_mode, notify_mode, notify_webhook_id, default_intro_template_id },
      { onConflict: "store_id" },
    );

  revalidatePath("/dashboard/settings");
}
