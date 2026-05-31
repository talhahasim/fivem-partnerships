import Link from "next/link";
import { Card } from "@/components/ui";

export default function InviteAcceptedPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl">
          🤝
        </div>
        <h1 className="mt-4 text-lg font-semibold text-zinc-100">Partnership accepted!</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Both partnership messages are on their way to each other&apos;s channels. You can close
          this tab.
        </p>
        <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4 text-left">
          <p className="text-sm font-medium text-zinc-100">Want to manage your partnerships?</p>
          <p className="mt-1 text-sm text-zinc-400">
            Create a free account to save webhooks, reuse templates, approve incoming posts, and
            broadcast to all partners at once.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Sign in with Discord
          </Link>
        </div>
      </Card>
    </main>
  );
}
