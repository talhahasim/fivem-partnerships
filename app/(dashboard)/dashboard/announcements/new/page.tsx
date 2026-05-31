import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { createAndBroadcast } from "@/app/actions/announcements";
import { EmbedEditor, type EditorProfile, type EditorTemplate } from "@/components/embed-editor/editor";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { Select } from "@/components/select";
import { MultiSelect } from "@/components/multi-select";
import type { Partnership, Store } from "@/lib/types/db";

export default async function NewAnnouncementPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();

  const [{ data }, { data: profilesData }, { data: webhooksData }, { data: templatesData }] =
    await Promise.all([
      supabase
        .from("partnerships")
        .select("*")
        .or(`inviter_store_id.eq.${store.id},invitee_store_id.eq.${store.id}`)
        .eq("status", "accepted"),
      supabase
        .from("sender_profiles")
        .select("id,name,username,avatar_url,is_default")
        .eq("store_id", store.id),
      supabase.from("webhooks").select("id,label").eq("store_id", store.id),
      supabase
        .from("templates")
        .select("id,name,payload_json")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false }),
    ]);
  const partnerships = (data ?? []) as Partnership[];
  const profiles = (profilesData ?? []) as EditorProfile[];
  const ownWebhooks = (webhooksData ?? []) as { id: string; label: string }[];
  const templates = (templatesData ?? []) as EditorTemplate[];

  const partnerIds = partnerships.map((p) =>
    p.inviter_store_id === store.id ? p.invitee_store_id : p.inviter_store_id,
  );
  const names = new Map<string, string>();
  if (partnerIds.length) {
    const { data: stores } = await supabase.from("stores").select("id,name").in("id", partnerIds);
    for (const s of (stores ?? []) as Pick<Store, "id" | "name">[]) names.set(s.id, s.name);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Announcements"
        title="New announcement"
        description="Compose your embed message and send it to partner channels — and/or your own channels."
      />
      <form action={createAndBroadcast} className="space-y-6">
        <Card className="space-y-4">
          <div>
            <Label htmlFor="title">Title (internal)</Label>
            <Input id="title" name="title" placeholder="e.g. New product: ..." />
          </div>
          <div>
            <Label htmlFor="target">Target</Label>
            <Select
              id="target"
              name="target"
              defaultValue="all"
              options={[
                { value: "all", label: `All partners (${partnerships.length})` },
                { value: "selected", label: "Selected partners" },
                { value: "own", label: "Only my own channels (no partners)" },
              ]}
            />
          </div>
          {partnerships.length > 0 && (
            <div>
              <Label>Selected partners (when target = selected)</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {partnerships.map((p) => {
                  const partnerId = p.inviter_store_id === store.id ? p.invitee_store_id : p.inviter_store_id;
                  return (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-zinc-300">
                      <input type="checkbox" name="partnership_ids" value={p.id} />
                      {names.get(partnerId) ?? "Store"}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {ownWebhooks.length > 0 && (
            <div className="border-t border-border pt-4">
              <Label>Your own channels (sent directly, no approval)</Label>
              <p className="mb-2 text-xs text-faint">
                Post this announcement to your own webhooks too — independent of partners.
              </p>
              <MultiSelect
                name="own_webhook_ids"
                placeholder="Select your channels…"
                options={ownWebhooks.map((w) => ({ value: w.id, label: w.label }))}
              />
            </div>
          )}
        </Card>

        <Card>
          <EmbedEditor name="payload" profiles={profiles} templates={templates} />
        </Card>

        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
