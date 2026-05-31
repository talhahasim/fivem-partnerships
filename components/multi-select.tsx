"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UilAngleDown, UilCheck, UilSearch, UilTimes } from "@iconscout/react-unicons";
import { cn } from "@/components/ui";
import type { SelectOption } from "@/components/select";

export function MultiSelect({
  options,
  name,
  placeholder = "Select…",
  emptyText = "No matches",
}: {
  options: SelectOption[];
  name: string;
  placeholder?: string;
  emptyText?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  function toggle(value: string) {
    setSelected((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));
  }

  return (
    <div ref={rootRef} className="relative">
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-input px-3.5 py-2.5 text-left text-sm outline-none transition-colors",
          open ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-border-strong",
        )}
      >
        <span className={cn("truncate", selected.length ? "text-foreground" : "text-faint")}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <UilAngleDown
          size={18}
          className={cn("shrink-0 text-faint transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <span
              key={o.value}
              className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary-2"
            >
              {o.label}
              <button
                type="button"
                aria-label={`Remove ${o.label}`}
                onClick={() => toggle(o.value)}
                className="text-primary-2/70 hover:text-primary-2"
              >
                <UilTimes size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="animate-pop absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <UilSearch size={15} className="shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-faint">{emptyText}</div>}
            {filtered.map((o) => {
              const isSel = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isSel ? "text-foreground" : "text-muted hover:bg-white/[0.06]",
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSel ? "border-primary bg-primary text-white" : "border-border",
                      )}
                    >
                      {isSel && <UilCheck size={12} />}
                    </span>
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
