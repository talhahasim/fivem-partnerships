"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/select";
import type { Store } from "@/lib/types/db";
import { setActiveStore } from "@/app/actions/active-store";

export function StoreSwitcher({ stores, activeId }: { stores: Store[]; activeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1.5">
      <span className="px-1 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">Store</span>
      <Select
        value={activeId}
        disabled={pending}
        options={stores.map((s) => ({ value: s.id, label: s.name }))}
        onValueChange={(id) => {
          if (id === activeId) return;
          startTransition(async () => {
            await setActiveStore(id);
            router.refresh();
          });
        }}
        className="font-medium"
      />
    </div>
  );
}
