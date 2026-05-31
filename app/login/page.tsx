import Link from "next/link";
import { DiscordLoginButton } from "@/components/auth/discord-login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="animate-rise w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-white">
            P
          </span>
          <span className="font-display text-base font-semibold tracking-tight">Partner</span>
        </Link>

        <div className="glass rounded-2xl p-7 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">
            Sign in with Discord to manage your store.
          </p>

          {error && (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              Sign-in failed, please try again.
            </p>
          )}

          <div className="mt-6">
            <DiscordLoginButton next={safeNext} />
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-faint">
          By continuing you agree to the terms of service.
        </p>
      </div>
    </main>
  );
}
