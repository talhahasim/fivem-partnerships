import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { approveDelivery, rejectDelivery } from "@/app/actions/deliveries";
import { DiscordPreview } from "@/components/embed-editor/preview";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import type { Delivery, Store } from "@/lib/types/db";

export default async function InboxPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();

  const { data } = await supabase
    .from("deliveries")
    .select("*")
    .eq("recipient_store_id", store.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const deliveries = (data ?? []) as Delivery[];

  const senderIds = [...new Set(deliveries.map((d) => d.sender_store_id))];
  const names = new Map<string, string>();
  if (senderIds.length) {
    const { data: stores } = await supabase.from("stores").select("id,name").in("id", senderIds);
    for (const s of (stores ?? []) as Pick<Store, "id" | "name">[]) names.set(s.id, s.name);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Pending messages"
        description="Partner messages waiting to be posted to your channel. They send once you approve."
      />
      {deliveries.length === 0 ? (
        <EmptyState title="No pending messages" hint="You're all caught up." />
      ) : (
        <div className="space-y-4">
          {deliveries.map((d) => (
            <Card key={d.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-100">
                    {names.get(d.sender_store_id) ?? "A store"}
                  </span>
                  <Badge tone={d.source_type === "intro" ? "indigo" : "green"}>
                    {d.source_type === "intro" ? "partnership" : "announcement"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <form action={approveDelivery}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit">Approve &amp; send</Button>
                  </form>
                  <form action={rejectDelivery}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit" variant="ghost">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
              <DiscordPreview message={d.payload_json} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
