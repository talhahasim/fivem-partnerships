"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UilBell } from "@iconscout/react-unicons";
import { cn } from "@/components/ui";

export function NotificationBell({ count }: { count: number }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/dashboard/inbox");
  return (
    <Link
      href="/dashboard/inbox"
      aria-label="Pending messages"
      title="Pending messages"
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        active ? "bg-white/[0.08] text-foreground" : "text-faint hover:bg-white/[0.05] hover:text-foreground",
      )}
    >
      <UilBell size={18} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
