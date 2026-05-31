import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { deleteWebhook, updateWebhookThread } from "@/app/actions/webhooks";
import { AddWebhookForm } from "@/components/webhooks/add-form";
import { Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";
import type { Webhook } from "@/lib/types/db";

export default async function WebhooksPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();
  const { data } = await supabase
    .from("webhooks")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const webhooks = (data ?? []) as Webhook[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Webhooks"
        title="Channel webhooks"
        description="Webhooks bound to your Discord channels. URLs are stored encrypted."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {webhooks.length === 0 ? (
            <EmptyState title="No webhooks yet" hint="Add your first webhook from the form on the right." />
          ) : (
            webhooks.map((w) => (
              <Card key={w.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-100">{w.label}</span>
                      {w.is_valid ? <Badge tone="green">valid</Badge> : <Badge tone="red">invalid</Badge>}
                      {w.thread_id && <Badge tone="indigo">forum post</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {w.channel_name ? `#${w.channel_name}` : "channel unknown"}
                      {w.thread_id && ` · post ${w.thread_id}`}
                    </div>
                  </div>
                  <form action={deleteWebhook}>
                    <input type="hidden" name="id" value={w.id} />
                    <DeleteButton label="Delete webhook" />
                  </form>
                </div>

                {/* Forum post ata/düzenle (forum kanalları için) */}
                <form action={updateWebhookThread} className="flex items-end gap-2 border-t border-border pt-3">
                  <input type="hidden" name="id" value={w.id} />
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-faint">
                      Forum post (only for forum/post channels — leave empty for normal channels)
                    </label>
                    <Input
                      name="thread_id"
                      defaultValue={w.thread_id ?? ""}
                      placeholder="forum post link or thread ID"
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button type="submit" variant="secondary">
                    Save
                  </Button>
                </form>
              </Card>
            ))
          )}
        </div>
        <Card className="h-fit">
          <h2 className="mb-3 font-medium text-zinc-100">New webhook</h2>
          <AddWebhookForm />
        </Card>
      </div>
    </div>
  );
}
