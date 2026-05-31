import Link from "next/link";
import { LinkButton } from "@/components/ui";

const FEATURES = [
  { t: "Collect webhooks", d: "Send an invite link and let partners add their own channel webhook. URLs are stored encrypted." },
  { t: "Publish in one click", d: "When you launch a product, send a clean embed to every partner channel at once." },
  { t: "Stay in control", d: "Decide whether incoming messages post automatically or wait for your approval." },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-white">
            P
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">Partner</span>
        </div>
        <Link href="/login" className="text-sm text-muted transition hover:text-foreground">
          Sign in →
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="animate-rise mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3.5 py-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
          For FiveM &amp; RedM stores
        </div>

        <h1 className="animate-rise font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl" style={{ animationDelay: "60ms" }}>
          Put your Discord
          <br />
          <span className="text-gradient">partnerships on autopilot</span>
        </h1>

        <p className="animate-rise mt-6 max-w-xl text-lg text-muted" style={{ animationDelay: "120ms" }}>
          Collect your partner channel webhooks in one place and broadcast polished embed
          announcements to all of them at once — no manual work.
        </p>

        <div className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "180ms" }}>
          <LinkButton href="/login" className="px-6 py-3 text-base">
            <DiscordGlyph />
            Get started with Discord
          </LinkButton>
          <Link
            href="#how"
            className="rounded-xl px-5 py-3 text-base text-muted transition hover:text-foreground"
          >
            How it works
          </Link>
        </div>

        {/* Feature cards */}
        <div id="how" className="mt-20 grid w-full gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.t}
              className="glass glass-hover animate-rise rounded-2xl p-5"
              style={{ animationDelay: `${240 + i * 80}ms` }}
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 font-display text-sm font-bold text-primary-2">
                {i + 1}
              </div>
              <h3 className="font-display text-base font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8 text-center text-xs text-faint">
        No bot required. Setup takes minutes. Webhook URLs are stored encrypted.
      </footer>
    </main>
  );
}

function DiscordGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M20.3 4.4A19 19 0 0 0 15.6 3l-.2.5a14 14 0 0 1 4.1 2A16 16 0 0 0 4.5 5.5a14 14 0 0 1 4.1-2L8.4 3a19 19 0 0 0-4.7 1.4C1.2 8.4.5 12.3.8 16.2A19 19 0 0 0 6.6 19l.4-.6a12 12 0 0 1-1.9-.9l.5-.4a13 13 0 0 0 11 0l.5.4c-.6.4-1.2.7-1.9.9l.4.6a19 19 0 0 0 5.8-2.9c.4-4.5-.6-8.4-2.6-11.7ZM9 14c-.9 0-1.6-.8-1.6-1.9S8.1 10.3 9 10.3s1.6.8 1.6 1.9S9.9 14 9 14Zm6 0c-.9 0-1.6-.8-1.6-1.9s.7-1.8 1.6-1.8 1.6.8 1.6 1.9S15.9 14 15 14Z" />
    </svg>
  );
}
