import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { TemplateForm } from "@/components/templates/template-form";
import { PageHeader } from "@/components/ui";
import type { EditorProfile } from "@/components/embed-editor/editor";
import type { Template } from "@/lib/types/db";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireActiveStore();
  const supabase = await createClient();
  const [{ data }, { data: profilesData }] = await Promise.all([
    supabase.from("templates").select("*").eq("id", id).eq("store_id", store.id).maybeSingle(),
    supabase
      .from("sender_profiles")
      .select("id,name,username,avatar_url,is_default")
      .eq("store_id", store.id),
  ]);

  if (!data) notFound();
  const template = data as Template;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Templates" title="Edit template" description={template.name} />
      <TemplateForm template={template} profiles={(profilesData ?? []) as EditorProfile[]} />
    </div>
  );
}
