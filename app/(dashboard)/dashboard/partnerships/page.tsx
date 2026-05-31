import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { revokePartnership } from "@/app/actions/partnerships";
import { Badge, Button, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import type { Partnership, Store } from "@/lib/types/db";

export default async function PartnershipsPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();

  const { data } = await supabase
    .from("partnerships")
    .select("*")
    .or(`inviter_store_id.eq.${store.id},invitee_store_id.eq.${store.id}`)
    .order("created_at", { ascending: false });
  const partnerships = (data ?? []) as Partnership[];

  // Partner mağaza isimleri
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
        eyebrow="Partnerships"
        title="Your partnerships"
        description="Established partnerships."
        action={<LinkButton href="/dashboard/partnerships/new">+ New invite</LinkButton>}
      />
      {partnerships.length === 0 ? (
        <EmptyState title="No partnerships yet" hint="Start by creating an invite link." />
      ) : (
        <div className="space-y-3">
          {partnerships.map((p) => {
            const partnerId = p.inviter_store_id === store.id ? p.invitee_store_id : p.inviter_store_id;
            return (
              <Card key={p.id} className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">
                      {names.get(partnerId) ?? "Unknown store"}
                    </span>
                    {p.status === "accepted" ? (
                      <Badge tone="green">active</Badge>
                    ) : (
                      <Badge tone="red">revoked</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {p.inviter_store_id === store.id ? "You invited them" : "They invited you"}
                  </div>
                </div>
                {p.status === "accepted" && (
                  <form action={revokePartnership}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="danger">
                      Revoke
                    </Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
