import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { InviteForm } from "@/components/partnerships/invite-form";
import { AddWebhookForm } from "@/components/webhooks/add-form";
import { Card, PageHeader } from "@/components/ui";

export default async function NewPartnershipPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();

  const [webhooksRes, templatesRes, settingsRes] = await Promise.all([
    supabase.from("webhooks").select("id,label").eq("store_id", store.id),
    supabase
      .from("templates")
      .select("id,name")
      .eq("store_id", store.id)
      .in("type", ["partnership_intro", "custom"]),
    supabase.from("store_settings").select("default_intro_template_id").eq("store_id", store.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partnerships"
        title="Invite a partner"
        description="Generate a link and send it to a partner. They open it, pick a channel on their side, and the partnership is set up — your messages start flowing to each other's channels."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          {/* Kısa, net "nasıl çalışır" */}
          <div className="mb-5 rounded-lg border border-border bg-input/60 p-4 text-sm text-muted">
            <p className="mb-2 font-medium text-foreground">How it works</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Pick a channel in <span className="text-foreground">your own server</span>{" "}
                below — this is where your partner&apos;s posts will appear.
              </li>
              <li>Send them the generated link.</li>
              <li>
                They pick a channel on <span className="text-foreground">their</span>{" "}
                side. From then on, each store&apos;s announcements post to the other&apos;s chosen channel.
              </li>
            </ol>
          </div>

          <InviteForm
            webhooks={webhooksRes.data ?? []}
            templates={templatesRes.data ?? []}
            defaultTemplateId={settingsRes.data?.default_intro_template_id ?? null}
          />
        </Card>

        <Card className="h-fit">
          <h2 className="font-medium text-foreground">Add a channel</h2>
          <p className="mb-3 mt-1 text-xs text-muted">
            Don&apos;t have a channel set up yet? Paste a Discord webhook URL here — it&apos;ll appear in
            the dropdown on the left right away.
          </p>
          <AddWebhookForm />
        </Card>
      </div>
    </div>
  );
}
