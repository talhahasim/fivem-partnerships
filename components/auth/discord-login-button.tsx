"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function DiscordLoginButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: callback.toString(), scopes: "identify email" },
    });
    if (error) setLoading(false);
  }

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M20.3 4.4A19 19 0 0 0 15.6 3l-.2.5a14 14 0 0 1 4.1 2A16 16 0 0 0 4.5 5.5a14 14 0 0 1 4.1-2L8.4 3a19 19 0 0 0-4.7 1.4C1.2 8.4.5 12.3.8 16.2A19 19 0 0 0 6.6 19l.4-.6a12 12 0 0 1-1.9-.9l.5-.4a13 13 0 0 0 11 0l.5.4c-.6.4-1.2.7-1.9.9l.4.6a19 19 0 0 0 5.8-2.9c.4-4.5-.6-8.4-2.6-11.7ZM9 14c-.9 0-1.6-.8-1.6-1.9S8.1 10.3 9 10.3s1.6.8 1.6 1.9S9.9 14 9 14Zm6 0c-.9 0-1.6-.8-1.6-1.9s.7-1.8 1.6-1.8 1.6.8 1.6 1.9S15.9 14 15 14Z" />
      </svg>
      {loading ? "Redirecting..." : "Continue with Discord"}
    </button>
  );
}
