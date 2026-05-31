"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addWebhook, type ActionState } from "@/app/actions/webhooks";
import { Button, Input, Label } from "@/components/ui";

const initial: ActionState = {};

export function AddWebhookForm() {
  const [state, action, pending] = useActionState(addWebhook, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh(); // yeni webhook'u select'lere de yansıt
    }
  }, [state.ok, router]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div>
        <Label htmlFor="label">Label</Label>
        <Input id="label" name="label" placeholder="e.g. Partnerships Channel" />
      </div>
      <div>
        <Label htmlFor="url">Discord Webhook URL *</Label>
        <Input
          id="url"
          name="url"
          required
          placeholder="https://discord.com/api/webhooks/..."
          type="url"
        />
      </div>
      <div>
        <Label htmlFor="thread_id">Forum post (optional)</Label>
        <Input
          id="thread_id"
          name="thread_id"
          placeholder="forum post link or thread ID"
          className="font-mono text-xs"
        />
        <p className="mt-1 text-xs text-faint">
          Only if this is a <span className="text-foreground">forum/post</span>{" "}
          channel. Messages go into that post; new posts are never created. Can be overridden per partner.
        </p>
      </div>
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-400">Webhook added.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Validating..." : "Add webhook"}
      </Button>
    </form>
  );
}
