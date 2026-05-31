"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { acceptInviteGuest } from "@/app/actions/invites";
import { Button, Input, Label, Textarea } from "@/components/ui";

/**
 * Misafir (kayıtsız) kabul formu. "Accept partnership"e basınca önce bir onay
 * popup'ı çıkar: kayıt olmadan gönderilen mesajlar webhook'a DOĞRUDAN düşer;
 * kayıt olunursa her mesaj önce onaya gelir.
 */
export function GuestAcceptForm({ token }: { token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function openConfirm() {
    // Zorunlu alanlar (mağaza adı, webhook URL) boşsa native uyarıyı göster, modal açma.
    const form = formRef.current;
    if (form && !form.reportValidity()) return;
    setConfirmOpen(true);
  }

  function submitNow() {
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={acceptInviteGuest} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <Label htmlFor="store_name">Your store / server name *</Label>
          <Input id="store_name" name="store_name" placeholder="e.g. GFX Development" required />
        </div>
        <div>
          <Label htmlFor="webhook_url">Your Discord channel webhook URL *</Label>
          <Input
            id="webhook_url"
            name="webhook_url"
            placeholder="https://discord.com/api/webhooks/…"
            className="font-mono text-xs"
            required
          />
          <p className="mt-1 text-xs text-faint">
            Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL. Their message
            lands in that channel.
          </p>
        </div>
        <div>
          <Label htmlFor="thread_id">Forum post (optional)</Label>
          <Input
            id="thread_id"
            name="thread_id"
            placeholder="https://discord.com/channels/… or thread ID"
            className="font-mono text-xs"
          />
          <p className="mt-1 text-xs text-faint">
            Only if your channel is a forum/post channel — messages go into that post, never a new one.
          </p>
        </div>
        <div>
          <Label htmlFor="message">Your partnership message (optional)</Label>
          <Textarea
            id="message"
            name="message"
            rows={3}
            placeholder="A short message we'll post to their channel. Leave empty to use a default."
          />
        </div>
        <Button type="button" onClick={openConfirm}>
          Accept partnership
        </Button>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setConfirmOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-confirm-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
          >
            <h2 id="guest-confirm-title" className="text-base font-semibold text-zinc-100">
              Accept without an account?
            </h2>
            <div className="mt-2 space-y-3 text-sm text-zinc-400">
              <p>
                You&apos;re accepting <strong className="text-zinc-200">without signing in</strong>.
                That means messages from your partner will be posted to this webhook{" "}
                <strong className="text-zinc-200">directly and automatically</strong> — you
                won&apos;t get a chance to review them before they appear in your channel.
              </p>
              <p>
                If you <strong className="text-zinc-200">create a free account</strong> instead,
                every incoming partner message <strong className="text-zinc-200">waits for your
                approval first</strong>: you get a notification, review the message, and it is only
                sent if you approve it.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={`/login?next=/invite/${token}`}
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Sign in with Discord (recommended)
              </Link>
              <Button type="button" variant="secondary" onClick={submitNow}>
                Continue without an account
              </Button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="mt-1 text-center text-xs text-faint hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
