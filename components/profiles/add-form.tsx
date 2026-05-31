"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addProfile, type ProfileState } from "@/app/actions/profiles";
import { Button, Input, Label } from "@/components/ui";

const initial: ProfileState = {};

export function AddProfileForm() {
  const [state, action, pending] = useActionState(addProfile, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setUsername("");
      setAvatar("");
      setImgError(false);
    }
  }, [state.ok]);

  const showImg = avatar.trim() && !imgError;

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {/* Live preview */}
      <div className="rounded-lg border border-border bg-[#313338] p-3">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-faint">Preview</div>
        <div className="flex gap-3">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              onError={() => setImgError(true)}
              onLoad={() => setImgError(false)}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/30" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-white">{username.trim() || "Webhook"}</span>
              <span className="rounded bg-primary px-1 text-[10px] font-bold text-white">BOT</span>
            </div>
            <div className="mt-0.5 text-sm text-zinc-300">New product just dropped! 🎉</div>
          </div>
        </div>
        {avatar.trim() && imgError && (
          <p className="mt-2 text-xs text-warning">Image couldn&apos;t load — check the URL.</p>
        )}
      </div>

      <div>
        <Label htmlFor="name">Profile name</Label>
        <Input id="name" name="name" required placeholder="e.g. Main Brand" />
      </div>
      <div>
        <Label htmlFor="username">Webhook username</Label>
        <Input
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. Nova Scripts"
        />
      </div>
      <div>
        <Label htmlFor="avatar_url">Avatar URL</Label>
        <Input
          id="avatar_url"
          name="avatar_url"
          type="url"
          value={avatar}
          onChange={(e) => {
            setAvatar(e.target.value);
            setImgError(false);
          }}
          placeholder="https://..."
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="is_default" /> Set as default
      </label>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.ok && <p className="text-xs text-accent">Profile saved.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
