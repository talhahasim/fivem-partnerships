import Link from "next/link";
import {
  UilLinkAlt,
  UilUsersAlt,
  UilInbox,
  UilMegaphone,
  UilArrowUpRight,
} from "@iconscout/react-unicons";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStore } from "@/lib/stores";
import { Badge, Card, PageHeader, LinkButton } from "@/components/ui";
import type { Announcement, Delivery, Store } from "@/lib/types/db";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function DashboardPage() {
  const { store } = await requireActiveStore();
  const supabase = await createClient();

  const [webhooks, partnerships, pending, announcements, pendingList, recentAnns, failed] =
    await Promise.all([
    supabase.from("webhooks").select("id", { count: "exact", head: true }).eq("store_id", store.id),
    supabase
      .from("partnerships")
      .select("id", { count: "exact", head: true })
      .or(`inviter_store_id.eq.${store.id},invitee_store_id.eq.${store.id}`)
      .eq("status", "accepted"),
    supabase
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .eq("recipient_store_id", store.id)
      .eq("status", "pending"),
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("store_id", store.id),
    supabase
      .from("deliveries")
      .select("id, sender_store_id, source_type, created_at")
      .eq("recipient_store_id", store.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("announcements")
      .select("id, title, created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("deliveries")
      .select("id, recipient_store_id, error, created_at")
      .eq("sender_store_id", store.id)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const pendingRows = (pendingList.data ?? []) as Pick<
    Delivery,
    "id" | "sender_store_id" | "source_type" | "created_at"
  >[];
  const annRows = (recentAnns.data ?? []) as Pick<Announcement, "id" | "title" | "created_at">[];
  const failedRows = (failed.data ?? []) as Pick<
    Delivery,
    "id" | "recipient_store_id" | "error" | "created_at"
  >[];

  // Store names for pending senders + failed recipients
  const nameIds = [
    ...new Set([
      ...pendingRows.map((d) => d.sender_store_id),
      ...failedRows.map((d) => d.recipient_store_id),
    ]),
  ];
  const names = new Map<string, string>();
  if (nameIds.length) {
    const { data: stores } = await supabase.from("stores").select("id,name").in("id", nameIds);
    for (const s of (stores ?? []) as Pick<Store, "id" | "name">[]) names.set(s.id, s.name);
  }

  // Delivery status counts per recent announcement
  const annIds = annRows.map((a) => a.id);
  const annCounts = new Map<string, { sent: number; total: number }>();
  if (annIds.length) {
    const { data: dels } = await supabase
      .from("deliveries")
      .select("source_id,status")
      .eq("sender_store_id", store.id)
      .eq("source_type", "announcement")
      .in("source_id", annIds);
    for (const d of (dels ?? []) as Pick<Delivery, "source_id" | "status">[]) {
      const key = d.source_id ?? "";
      const c = annCounts.get(key) ?? { sent: 0, total: 0 };
      c.total += 1;
      if (d.status === "sent") c.sent += 1;
      annCounts.set(key, c);
    }
  }

  const stats = [
    { label: "Webhooks", value: webhooks.count ?? 0, href: "/dashboard/webhooks", tone: "primary", Icon: UilLinkAlt },
    { label: "Partnerships", value: partnerships.count ?? 0, href: "/dashboard/partnerships", tone: "primary", Icon: UilUsersAlt },
    { label: "Pending approval", value: pending.count ?? 0, href: "/dashboard/inbox", tone: "warning", Icon: UilInbox },
    { label: "Announcements", value: announcements.count ?? 0, href: "/dashboard/announcements", tone: "accent", Icon: UilMegaphone },
  ] as const;

  const actions = [
    { label: "Add webhook", href: "/dashboard/webhooks", d: "Connect a Discord channel" },
    { label: "Partnership invite", href: "/dashboard/partnerships/new", d: "Generate an invite link" },
    { label: "Send announcement", href: "/dashboard/announcements/new", d: "Broadcast to partners" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={store.name}
        description="Command center for your partnerships, webhooks, and announcements."
        action={<LinkButton href="/dashboard/partnerships/new">+ Partnership invite</LinkButton>}
      />

      {/* Failed deliveries — never fail silently */}
      {failedRows.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-danger">
            ⚠ Delivery issues
          </h2>
          <ul className="space-y-1.5">
            {failedRows.map((d) => (
              <li key={d.id} className="text-xs text-zinc-300">
                <span className="font-medium text-foreground">
                  {names.get(d.recipient_store_id) ?? "A partner"}
                </span>{" "}
                — {d.error ?? "delivery failed"}{" "}
                <span className="text-faint">· {timeAgo(d.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="glass-hover group h-full">
              <div className="flex items-start justify-between">
                <span
                  className={
                    s.tone === "accent"
                      ? "flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent"
                      : s.tone === "warning"
                        ? "flex h-10 w-10 items-center justify-center rounded-xl bg-warning/12 text-warning"
                        : "flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary-2"
                  }
                >
                  <s.Icon size={20} />
                </span>
                <UilArrowUpRight size={18} className="text-faint transition group-hover:translate-x-0.5 group-hover:text-muted" />
              </div>
              <div className="mt-4 font-display text-4xl font-bold tracking-tight">{s.value}</div>
              <div className="mt-0.5 text-sm text-muted">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two-column: pending inbox + recent announcements */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending messages */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UilInbox size={18} className="text-warning" />
              <h2 className="font-display text-lg font-semibold">Pending messages</h2>
            </div>
            <Link href="/dashboard/inbox" className="text-xs text-primary-2 hover:underline">
              Inbox →
            </Link>
          </div>
          {pendingRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pendingRows.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{names.get(d.sender_store_id) ?? "A store"}</span>
                    <Badge tone={d.source_type === "intro" ? "indigo" : "green"}>
                      {d.source_type === "intro" ? "partnership" : "announcement"}
                    </Badge>
                  </div>
                  <span className="text-xs text-faint">{timeAgo(d.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent announcements */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UilMegaphone size={18} className="text-accent" />
              <h2 className="font-display text-lg font-semibold">Recent announcements</h2>
            </div>
            <Link href="/dashboard/announcements" className="text-xs text-primary-2 hover:underline">
              All →
            </Link>
          </div>
          {annRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {annRows.map((a) => {
                const c = annCounts.get(a.id) ?? { sent: 0, total: 0 };
                return (
                  <li key={a.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-foreground">{a.title}</div>
                      <div className="text-xs text-faint">{timeAgo(a.created_at)}</div>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {c.sent}/{c.total} sent
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.15em] text-faint">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {actions.map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className="glass-hover flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{a.label}</div>
                  <div className="text-xs text-muted">{a.d}</div>
                </div>
                <span className="text-primary-2">→</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
