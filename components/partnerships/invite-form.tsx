"use client";

import { useActionState, useState } from "react";
import { createInvite, type CreateInviteState } from "@/app/actions/invites";
import { Button, Input, Label } from "@/components/ui";
import { Select } from "@/components/select";

const initial: CreateInviteState = {};

export function InviteForm({
  webhooks,
  templates,
  defaultTemplateId,
}: {
  webhooks: { id: string; label: string }[];
  templates: { id: string; name: string }[];
  defaultTemplateId: string | null;
}) {
  const [state, action, pending] = useActionState(createInvite, initial);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="webhook_id">Channel for your partner&apos;s posts *</Label>
          <Select
            id="webhook_id"
            name="webhook_id"
            placeholder="— Select a channel —"
            options={webhooks.map((w) => ({ value: w.id, label: w.label }))}
          />
          <p className="mt-1.5 text-xs text-muted">
            A channel in <span className="text-foreground">your</span>{" "}
            server (via webhook) where this partner&apos;s intro and announcements will be posted.
          </p>
          {webhooks.length === 0 && (
            <p className="mt-1 text-xs text-warning">No channels yet — add one on the right →</p>
          )}
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
            Only if the channel above is a <span className="text-foreground">forum/post</span>{" "}
            channel. Paste the post link — messages go into that post; new posts are never created.
          </p>
        </div>
        <div>
          <Label htmlFor="template_id">Your partnership message template</Label>
          <Select
            id="template_id"
            name="template_id"
            defaultValue={defaultTemplateId ?? ""}
            options={[
              { value: "", label: "Default message" },
              ...templates.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
        </div>
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
        <Button type="submit" disabled={pending || webhooks.length === 0}>
          {pending ? "Creating..." : "Create invite link"}
        </Button>
      </form>

      {state.link && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-3">
          <p className="text-sm text-accent">Invite link ready — send it to your partner:</p>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={state.link} className="font-mono text-xs" />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(state.link!);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
