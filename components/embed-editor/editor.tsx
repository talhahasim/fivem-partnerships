"use client";

import { useState } from "react";
import type { DiscordMessage, Embed } from "@/lib/embed/schema";
import { messageSchema, totalEmbedChars } from "@/lib/embed/schema";
import { importFromDiscohook, toDiscohookUrl } from "@/lib/embed/discohook";
import { DiscordPreview } from "@/components/embed-editor/preview";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { Select } from "@/components/select";

export type EditorProfile = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  is_default: boolean;
};

function hexToInt(hex: string): number | undefined {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  return m ? parseInt(m[1], 16) : undefined;
}
function intToHex(color?: number): string {
  if (color == null) return "#5865f2";
  return `#${color.toString(16).padStart(6, "0")}`;
}

const EMPTY_EMBED: Embed = {};

export function EmbedEditor({
  name = "payload",
  defaultValue,
  profiles = [],
}: {
  name?: string;
  defaultValue?: DiscordMessage;
  profiles?: EditorProfile[];
}) {
  const [msg, setMsg] = useState<DiscordMessage>(() => {
    const base = defaultValue ?? { embeds: [{ ...EMPTY_EMBED }] };
    const def = profiles.find((p) => p.is_default);
    if (def && !base.username && !base.avatar_url) {
      return { ...base, username: def.username ?? undefined, avatar_url: def.avatar_url ?? undefined };
    }
    return base;
  });
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const embeds = msg.embeds ?? [];
  const parsed = messageSchema.safeParse(msg);
  const charCount = totalEmbedChars(embeds);

  function patch(p: Partial<DiscordMessage>) {
    setMsg((m) => ({ ...m, ...p }));
  }
  function patchEmbed(i: number, p: Partial<Embed>) {
    setMsg((m) => {
      const next = [...(m.embeds ?? [])];
      next[i] = { ...next[i], ...p };
      return { ...m, embeds: next };
    });
  }
  function addEmbed() {
    if (embeds.length >= 10) return;
    setMsg((m) => ({ ...m, embeds: [...(m.embeds ?? []), { ...EMPTY_EMBED }] }));
  }
  function removeEmbed(i: number) {
    setMsg((m) => ({ ...m, embeds: (m.embeds ?? []).filter((_, idx) => idx !== i) }));
  }
  function addField(i: number) {
    const e = embeds[i];
    if ((e.fields?.length ?? 0) >= 25) return;
    patchEmbed(i, { fields: [...(e.fields ?? []), { name: "Field", value: "Value" }] });
  }
  function patchField(ei: number, fi: number, p: Partial<{ name: string; value: string; inline: boolean }>) {
    const e = embeds[ei];
    const fields = [...(e.fields ?? [])];
    fields[fi] = { ...fields[fi], ...p };
    patchEmbed(ei, { fields });
  }
  function removeField(ei: number, fi: number) {
    const e = embeds[ei];
    patchEmbed(ei, { fields: (e.fields ?? []).filter((_, idx) => idx !== fi) });
  }

  function doImport() {
    const result = importFromDiscohook(importText);
    if (!result) {
      setImportError("Invalid input — paste a discohook URL or valid message JSON.");
      return;
    }
    setImportError(null);
    setImportText("");
    setMsg(result);
  }

  // Boş string alanları temizleyip kaydedilecek temiz payload
  const clean = cleanMessage(msg);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {/* Discohook / JSON import/export */}
        <div className="rounded-lg border border-border p-3">
          <Label>Import — Discohook URL or JSON</Label>
          <Textarea
            rows={3}
            className="mt-1 font-mono text-xs"
            placeholder={'discohook.org URL  ·  or  {"embeds":[{"title":"..."}]}'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <Button type="button" variant="secondary" className="mt-2" onClick={doImport}>
            Import
          </Button>
          {importError && <p className="mt-1 text-xs text-red-400">{importError}</p>}
          <a
            href={toDiscohookUrl(clean)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs text-primary-2 hover:underline"
          >
            Open in Discohook →
          </a>
        </div>

        {profiles.length > 0 && (
          <div>
            <Label>Sender profile</Label>
            <Select
              placeholder="Apply a saved profile…"
              options={profiles.map((p) => ({ value: p.id, label: p.name }))}
              onValueChange={(id) => {
                const p = profiles.find((x) => x.id === id);
                if (p) patch({ username: p.username ?? undefined, avatar_url: p.avatar_url ?? undefined });
              }}
            />
            <p className="mt-1 text-xs text-faint">
              Fills the name &amp; avatar below. Manage profiles in the Profiles tab.
            </p>
          </div>
        )}
        <div>
          <Label>Webhook name (optional)</Label>
          <Input
            value={msg.username ?? ""}
            onChange={(e) => patch({ username: e.target.value || undefined })}
            placeholder="e.g. Partnership Bot"
          />
        </div>
        <div>
          <Label>Avatar URL (optional)</Label>
          <Input
            value={msg.avatar_url ?? ""}
            onChange={(e) => patch({ avatar_url: e.target.value || undefined })}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label>Content</Label>
          <Textarea
            rows={3}
            value={msg.content ?? ""}
            onChange={(e) => patch({ content: e.target.value || undefined })}
            placeholder="Plain message (optional)"
          />
        </div>

        {embeds.map((embed, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-300">Embed {i + 1}</span>
              <button
                type="button"
                onClick={() => removeEmbed(i)}
                className="text-xs text-red-400 hover:underline"
              >
                Remove
              </button>
            </div>
            <Input
              placeholder="Title"
              value={embed.title ?? ""}
              onChange={(e) => patchEmbed(i, { title: e.target.value || undefined })}
            />
            <Textarea
              rows={3}
              placeholder="Description"
              value={embed.description ?? ""}
              onChange={(e) => patchEmbed(i, { description: e.target.value || undefined })}
            />
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Color</Label>
              <input
                type="color"
                value={intToHex(embed.color)}
                onChange={(e) => patchEmbed(i, { color: hexToInt(e.target.value) })}
                className="h-9 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
              />
            </div>
            <Input
              placeholder="Author name"
              value={embed.author?.name ?? ""}
              onChange={(e) =>
                patchEmbed(i, { author: e.target.value ? { name: e.target.value } : undefined })
              }
            />
            <Input
              placeholder="Image URL"
              value={embed.image?.url ?? ""}
              onChange={(e) =>
                patchEmbed(i, { image: e.target.value ? { url: e.target.value } : undefined })
              }
            />
            <Input
              placeholder="Footer text"
              value={embed.footer?.text ?? ""}
              onChange={(e) =>
                patchEmbed(i, { footer: e.target.value ? { text: e.target.value } : undefined })
              }
            />

            {/* Fields */}
            <div className="space-y-2">
              {(embed.fields ?? []).map((f, fi) => (
                <div key={fi} className="rounded border border-border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Field {fi + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeField(i, fi)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      remove
                    </button>
                  </div>
                  <Input
                    className="mt-1"
                    placeholder="Field name"
                    value={f.name}
                    onChange={(e) => patchField(i, fi, { name: e.target.value })}
                  />
                  <Textarea
                    className="mt-1"
                    rows={2}
                    placeholder="Field value"
                    value={f.value}
                    onChange={(e) => patchField(i, fi, { value: e.target.value })}
                  />
                  <label className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={f.inline ?? false}
                      onChange={(e) => patchField(i, fi, { inline: e.target.checked })}
                    />
                    Inline
                  </label>
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={() => addField(i)}>
                + Add field
              </Button>
            </div>
          </div>
        ))}

        <Button type="button" variant="secondary" onClick={addEmbed} disabled={embeds.length >= 10}>
          + Add embed ({embeds.length}/10)
        </Button>
      </div>

      {/* Preview + validation + hidden input */}
      <div className="space-y-3">
        <Label>Preview</Label>
        <DiscordPreview message={clean} />
        <div className="text-xs text-zinc-500">
          Total embed characters: {charCount}/6000
        </div>
        {!parsed.success && (
          <p className="text-xs text-red-400">
            {parsed.error.issues[0]?.message ?? "Invalid message"}
          </p>
        )}
        <input type="hidden" name={name} value={JSON.stringify(clean)} />
      </div>
    </div>
  );
}

/** Boş alanları kaldırıp gönderilebilir temiz mesaj üretir. */
function cleanMessage(msg: DiscordMessage): DiscordMessage {
  const embeds = (msg.embeds ?? [])
    .map((e) => {
      const fields = (e.fields ?? []).filter((f) => f.name?.trim() && f.value?.trim());
      const out: Embed = {};
      if (e.title?.trim()) out.title = e.title;
      if (e.description?.trim()) out.description = e.description;
      if (e.url?.trim()) out.url = e.url;
      if (e.color != null) out.color = e.color;
      if (e.author?.name?.trim()) out.author = e.author;
      if (e.footer?.text?.trim()) out.footer = e.footer;
      if (e.image?.url?.trim()) out.image = e.image;
      if (e.thumbnail?.url?.trim()) out.thumbnail = e.thumbnail;
      if (fields.length) out.fields = fields;
      return out;
    })
    .filter((e) => Object.keys(e).length > 0);

  const out: DiscordMessage = {};
  if (msg.content?.trim()) out.content = msg.content;
  if (msg.username?.trim()) out.username = msg.username;
  if (msg.avatar_url?.trim()) out.avatar_url = msg.avatar_url;
  if (embeds.length) out.embeds = embeds;
  return out;
}
