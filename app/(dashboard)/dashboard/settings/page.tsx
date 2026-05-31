import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { updateSettings } from "@/app/actions/settings";
import { Button, Card, Label, PageHeader } from "@/components/ui";
import { Select } from "@/components/select";
import type { StoreSettings, Template, Webhook } from "@/lib/types/db";

export default async function SettingsPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();

  const [settingsRes, webhooksRes, templatesRes] = await Promise.all([
    supabase.from("store_settings").select("*").eq("store_id", store.id).maybeSingle(),
    supabase.from("webhooks").select("id,label").eq("store_id", store.id),
    supabase.from("templates").select("id,name,type").eq("store_id", store.id),
  ]);

  const settings = (settingsRes.data ?? {
    approval_mode: "manual",
    notify_mode: "channel",
    notify_webhook_id: null,
    default_intro_template_id: null,
  }) as StoreSettings;
  const webhooks = (webhooksRes.data ?? []) as Pick<Webhook, "id" | "label">[];
  const templates = (templatesRes.data ?? []) as Pick<Template, "id" | "name" | "type">[];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Settings" title="Preferences" description={`${store.name} store`} />
      <Card className="max-w-xl">
        <form action={updateSettings} className="space-y-5">
          <div>
            <Label htmlFor="approval_mode">Incoming message approval</Label>
            <Select
              id="approval_mode"
              name="approval_mode"
              defaultValue={settings.approval_mode}
              options={[
                { value: "manual", label: "Manual — let me approve first" },
                { value: "auto", label: "Automatic — send instantly" },
              ]}
            />
            <p className="mt-1.5 text-xs text-muted">
              How messages partners send to your channel behave.
            </p>
          </div>

          <div>
            <Label htmlFor="notify_mode">Notification method</Label>
            <Select
              id="notify_mode"
              name="notify_mode"
              defaultValue={settings.notify_mode}
              options={[
                { value: "channel", label: "Notify a Discord channel" },
                { value: "none", label: "Don't notify" },
              ]}
            />
          </div>

          <div>
            <Label htmlFor="notify_webhook_id">Notification channel (webhook)</Label>
            <Select
              id="notify_webhook_id"
              name="notify_webhook_id"
              defaultValue={settings.notify_webhook_id ?? ""}
              placeholder="— None selected —"
              options={[
                { value: "", label: "— None selected —" },
                ...webhooks.map((w) => ({ value: w.id, label: w.label })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="default_intro_template_id">Default partnership template</Label>
            <Select
              id="default_intro_template_id"
              name="default_intro_template_id"
              defaultValue={settings.default_intro_template_id ?? ""}
              placeholder="— None selected —"
              options={[
                { value: "", label: "— None selected —" },
                ...templates.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </div>

          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
