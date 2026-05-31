"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UilApps,
  UilLinkAlt,
  UilFileAlt,
  UilUsersAlt,
  UilMegaphone,
  UilUserCircle,
  UilSetting,
} from "@iconscout/react-unicons";
import { cn } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Overview", Icon: UilApps },
  { href: "/dashboard/announcements", label: "Announcements", Icon: UilMegaphone },
  { href: "/dashboard/webhooks", label: "Webhooks", Icon: UilLinkAlt },
  { href: "/dashboard/templates", label: "Templates", Icon: UilFileAlt },
  { href: "/dashboard/profiles", label: "Profiles", Icon: UilUserCircle },
  { href: "/dashboard/partnerships", label: "Partnerships", Icon: UilUsersAlt },
  { href: "/dashboard/settings", label: "Settings", Icon: UilSetting },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, Icon }) => {
        const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-white/[0.06] text-foreground"
                : "text-muted hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            )}
            <Icon size={18} className={active ? "text-primary-2" : "text-faint group-hover:text-muted"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
