import * as React from "react";
import Link from "next/link";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* Paylaşılan select/field stili — mat, içe gömülü koyu input */
export const fieldClass =
  "w-full rounded-lg border border-border bg-input px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "accent";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  accent: "bg-accent text-white hover:brightness-110",
  secondary: "bg-[#41434a] text-foreground hover:bg-[#4b4e56]",
  danger: "bg-danger text-white hover:brightness-90",
  ghost: "text-muted hover:text-foreground hover:bg-white/[0.06]",
};

const baseBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cn(baseBtn, variants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(baseBtn, variants[variant ?? "primary"], className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldClass, "resize-y leading-relaxed", props.className)} />;
}

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn("mb-1.5 block text-[13px] font-medium tracking-wide text-muted", props.className)}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("glass rounded-xl p-5", className)} />;
}

const tones = {
  zinc: { dot: "bg-faint", text: "text-muted", bg: "bg-white/[0.05]" },
  green: { dot: "bg-accent", text: "text-accent", bg: "bg-accent/10" },
  yellow: { dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
  red: { dot: "bg-danger", text: "text-danger", bg: "bg-danger/10" },
  indigo: { dot: "bg-primary-2", text: "text-primary-2", bg: "bg-primary/10" },
} as const;

export function Badge({
  children,
  tone = "zinc",
  dot = true,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  dot?: boolean;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        t.bg,
        t.text,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon = "✦",
  action,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center rounded-2xl border-dashed px-8 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary-2">
        {icon}
      </div>
      <p className="font-display text-lg text-foreground">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Küçük durum noktası (canlı/aktif göstergesi). */
export function StatusDot({ tone = "green" }: { tone?: keyof typeof tones }) {
  return <span className={cn("h-2 w-2 rounded-full", tones[tone].dot, "animate-pulse-dot")} />;
}
