"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UilAngleDown, UilCheck } from "@iconscout/react-unicons";
import { cn } from "@/components/ui";

export type SelectOption = { value: string; label: string };

export function Select({
  options,
  name,
  value: controlledValue,
  defaultValue,
  onValueChange,
  placeholder = "Seç",
  id,
  disabled,
  className,
}: {
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = controlledValue ?? internal;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const listboxId = `${id ?? reactId}-listbox`;

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
      listRef.current?.focus();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(v: string) {
    if (controlledValue === undefined) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) choose(opt.value);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-input px-3.5 py-2.5 text-left text-sm outline-none transition-colors",
          open ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-border-strong",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className={cn("truncate", selected ? "text-foreground" : "text-faint")}>
          {selected ? selected.label : placeholder}
        </span>
        <UilAngleDown
          size={18}
          className={cn("shrink-0 text-faint transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          id={listboxId}
          tabIndex={-1}
          aria-activedescendant={options[highlight] ? `${listboxId}-${highlight}` : undefined}
          onKeyDown={onKeyDown}
          className="animate-pop absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card-2 p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] outline-none"
        >
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-faint">Seçenek yok</div>
          )}
          {options.map((o, i) => {
            const isSelected = o.value === value;
            const isHighlight = i === highlight;
            return (
              <button
                key={o.value || `opt-${i}`}
                type="button"
                role="option"
                id={`${listboxId}-${i}`}
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(o.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  isHighlight ? "bg-white/[0.07] text-foreground" : "text-muted",
                  isSelected && "text-foreground",
                )}
              >
                <span className="truncate">{o.label}</span>
                {isSelected && <UilCheck size={16} className="shrink-0 text-primary-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
