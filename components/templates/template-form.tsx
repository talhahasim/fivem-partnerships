"use client";

import { useState, useTransition } from "react";
import { saveTemplate, importFromMessageLink } from "@/app/actions/templates";
import type { DiscordMessage } from "@/lib/embed/schema";
import { PRESETS } from "@/lib/embed/presets";
import { EmbedEditor, type EditorProfile } from "@/components/embed-editor/editor";
import { Button, Input, Label } from "@/components/ui";
import { Select } from "@/components/select";
import type { Template, TemplateType } from "@/lib/types/db";

const TYPE_LABELS: Record<string, string> = {
  partnership_intro: "Partnership message",
  product: "Product announcement",
  custom: "Custom",
};

export function TemplateForm({
  template,
  profiles = [],
}: {
  template?: Template;
  profiles?: EditorProfile[];
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [type, setType] = useState<TemplateType>(template?.type ?? "custom");
  const [value, setValue] = useState<DiscordMessage | undefined>(template?.payload_json);
  const [editorKey, setEditorKey] = useState(0);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function applyPayload(payload: DiscordMessage) {
    setValue(payload);
    setEditorKey((k) => k + 1);
  }

  function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    applyPayload(preset.payload);
    setType(preset.type);
    if (!name.trim()) setName(preset.name);
  }

  function importLink() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await importFromMessageLink(link);
      if (res.message) {
        applyPayload(res.message);
        setLink("");
        setOk(true);
      } else {
        setError(res.error ?? "Could not import.");
      }
    });
  }

  return (
    <form action={saveTemplate} className="space-y-6">
      {template && <input type="hidden" name="id" value={template.id} />}

      {/* Hazır şablon galerisi (yeni şablon oluştururken) */}
      {!template && (
        <div className="rounded-xl border border-border bg-card p-4">
          <Label>Start from the gallery</Label>
          <p className="mb-3 text-xs text-muted">
            Pick a ready-made design and edit it. Replace the [bracketed] parts with your own info.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map((p) => {
              const color = p.payload.embeds?.[0]?.color ?? 0x4e5058;
              const hex = `#${color.toString(16).padStart(6, "0")}`;
              const title = p.payload.embeds?.[0]?.title ?? p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="group flex flex-col gap-1.5 overflow-hidden rounded-lg border border-border bg-input p-3 text-left transition-colors hover:border-border-strong hover:bg-card-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: hex }} />
                    <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                  <span className="truncate text-xs text-muted">{title}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-faint">{p.category}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Template name *</Label>
          <Input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <Select
            id="type"
            name="type"
            value={type}
            onValueChange={(v) => setType(v as TemplateType)}
            options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>

      {/* Discord mesaj linkinden içe aktar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <Label>Import from a Discord message link</Label>
        <p className="mb-2.5 text-xs text-muted">
          Paste the link of a message sent by your own webhook — its content becomes a template
          automatically. (Right-click the message → <span className="text-foreground">Copy Message Link</span>)
        </p>
        <div className="flex gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://discord.com/channels/…/…/…"
            className="font-mono text-xs"
          />
          <Button type="button" variant="secondary" onClick={importLink} disabled={pending || !link.trim()}>
            {pending ? "Fetching…" : "Import"}
          </Button>
        </div>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        {ok && <p className="mt-1.5 text-xs text-accent">Message imported.</p>}
      </div>

      <EmbedEditor key={editorKey} name="payload" defaultValue={value} profiles={profiles} />

      <Button type="submit">{template ? "Update" : "Save"}</Button>
    </form>
  );
}
