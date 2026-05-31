import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { deleteTemplate } from "@/app/actions/templates";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";
import type { Template } from "@/lib/types/db";

const TYPE_TONE = {
  partnership_intro: "indigo",
  product: "green",
  custom: "zinc",
} as const;

export default async function TemplatesPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();
  const { data } = await supabase
    .from("templates")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const templates = (data ?? []) as Template[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Templates"
        title="Message templates"
        description="Saved embeds for partnership and product messages."
        action={<LinkButton href="/dashboard/templates/new">+ New template</LinkButton>}
      />
      {templates.length === 0 ? (
        <EmptyState title="No templates yet" hint="Create your first embed template." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-100">{t.name}</span>
                <Badge tone={TYPE_TONE[t.type]}>{t.type}</Badge>
              </div>
              <p className="line-clamp-2 text-xs text-zinc-500">
                {t.payload_json?.embeds?.[0]?.title ?? t.payload_json?.content ?? "—"}
              </p>
              <div className="mt-auto flex gap-2">
                <LinkButton href={`/dashboard/templates/${t.id}`} variant="secondary">
                  Edit
                </LinkButton>
                <form action={deleteTemplate}>
                  <input type="hidden" name="id" value={t.id} />
                  <DeleteButton label="Delete template" />
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
