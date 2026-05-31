import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import type { Announcement, Delivery } from "@/lib/types/db";

export default async function AnnouncementsPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();

  const [annRes, delRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("deliveries")
      .select("source_id,status,error")
      .eq("sender_store_id", store.id)
      .eq("source_type", "announcement"),
  ]);

  const announcements = (annRes.data ?? []) as Announcement[];
  const deliveries = (delRes.data ?? []) as Pick<Delivery, "source_id" | "status" | "error">[];

  function summary(annId: string) {
    const rows = deliveries.filter((d) => d.source_id === annId);
    const errors = [
      ...new Set(rows.filter((d) => d.status === "failed" && d.error).map((d) => d.error as string)),
    ];
    return {
      sent: rows.filter((d) => d.status === "sent").length,
      pending: rows.filter((d) => d.status === "pending" || d.status === "approved").length,
      failed: rows.filter((d) => d.status === "failed").length,
      total: rows.length,
      errors,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Announcements"
        title="Your announcements"
        description="Product and announcement messages sent to partner channels."
        action={<LinkButton href="/dashboard/announcements/new">+ New announcement</LinkButton>}
      />
      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet" hint="Send your first announcement." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const c = summary(a.id);
            return (
              <Card key={a.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-zinc-100">{a.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {new Date(a.created_at).toLocaleString("en-US")} · {c.total} partners
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Badge tone="green">{c.sent} sent</Badge>
                    {c.pending > 0 && <Badge tone="yellow">{c.pending} pending</Badge>}
                    {c.failed > 0 && <Badge tone="red">{c.failed} failed</Badge>}
                  </div>
                </div>

                {/* Başarısızlık sebepleri — sessizce geçme */}
                {c.errors.length > 0 && (
                  <div className="rounded-lg border border-danger/30 bg-danger/10 p-2.5">
                    {c.errors.map((e, i) => (
                      <p key={i} className="text-xs text-danger">
                        ⚠ {e}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
