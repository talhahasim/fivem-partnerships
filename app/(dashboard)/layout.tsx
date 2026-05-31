import { redirect } from "next/navigation";
import Link from "next/link";
import { UilSignout, UilPlusCircle } from "@iconscout/react-unicons";
import { requireUser } from "@/lib/auth";
import { getActiveStore } from "@/lib/stores";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { StoreSwitcher } from "@/components/dashboard/store-switcher";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { signOut } from "@/app/actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { store, stores } = await getActiveStore();
  if (!store) redirect("/onboarding");

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    "Account";

  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .eq("recipient_store_id", store.id)
    .eq("status", "pending");

  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-6 border-r border-border bg-sidebar p-4">
        <div className="flex items-center justify-between px-1 pt-1">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-white">
              P
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              Partner
            </span>
          </Link>
          <NotificationBell count={pendingCount ?? 0} />
        </div>

        <StoreSwitcher stores={stores} activeId={store.id} />

        <Sidebar />

        <div className="mt-auto space-y-2 border-t border-border pt-3">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted transition hover:bg-white/[0.05] hover:text-foreground"
          >
            <UilPlusCircle size={16} className="text-faint" />
            New store
          </Link>

          {/* User chip */}
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.02] p-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
              <div className="text-[11px] text-faint">Discord</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-danger/12 hover:text-danger"
              >
                <UilSignout size={18} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl animate-rise px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
