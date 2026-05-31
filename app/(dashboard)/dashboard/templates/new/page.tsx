import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { TemplateForm } from "@/components/templates/template-form";
import { PageHeader } from "@/components/ui";
import type { EditorProfile } from "@/components/embed-editor/editor";

export default async function NewTemplatePage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sender_profiles")
    .select("id,name,username,avatar_url,is_default")
    .eq("store_id", store.id);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Templates" title="New template" description="Design your embed message and save it." />
      <TemplateForm profiles={(data ?? []) as EditorProfile[]} />
    </div>
  );
}
