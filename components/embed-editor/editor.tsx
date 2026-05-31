"use client";

import { useEffect, useRef, useState } from "react";
import type { DiscordMessage, Embed } from "@/lib/embed/schema";
import { messageSchema, totalEmbedChars } from "@/lib/embed/schema";
import { importFromDiscohook, toDiscohookUrl } from "@/lib/embed/discohook";
import { Button, Textarea } from "@/components/ui";
import { Select } from "@/components/select";

export type EditorProfile = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  is_default: boolean;
};

export type EditorTemplate = {
  id: string;
  name: string;
  payload_json: DiscordMessage;
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

// Inline (kenarlıksız) düzenlenebilir alanlar — preview'a gömülü görünür.
const FIELD =
  "w-full bg-transparent outline-none rounded px-1 -mx-1 transition-colors " +
  "hover:bg-white/[0.04] focus:bg-white/[0.07] placeholder:text-zinc-600";

/** Yüksekliği içeriğe göre büyüyen kenarlıksız textarea. */
function AutoArea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${FIELD} resize-none overflow-hidden ${className}`}
    />
  );
}

/** Avatar dairesi — tıklayınca URL girişi açılır. */
function AvatarSlot({ url, onChange }: { url?: string; onChange: (v: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-indigo-600" />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Set avatar URL"
        className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[8px] text-white ring-2 ring-[#313338] hover:bg-zinc-600"
      >
        ✎
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-20 w-64 rounded-md border border-border bg-card p-2 shadow-xl">
          <input
            autoFocus
            value={url ?? ""}
            placeholder="Avatar image URL"
            onChange={(e) => onChange(e.target.value || undefined)}
            onBlur={() => setOpen(false)}
            className="w-full rounded bg-input px-2 py-1 font-mono text-xs text-zinc-200 outline-none"
          />
        </div>
      )}
    </div>
  );
}

/** Embed görseli/thumbnail/GIF slotu — boşken "+ ekle", doluyken görsel + düzenle/sil. */
function ImageSlot({
  url,
  onChange,
  label,
  variant,
}: {
  url?: string;
  onChange: (v: string | undefined) => void;
  label: string;
  variant: "image" | "thumb";
}) {
  const [editing, setEditing] = useState(false);
  const isThumb = variant === "thumb";

  if (!url && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`flex items-center justify-center rounded border border-dashed border-border text-[11px] text-zinc-500 hover:border-border-strong hover:text-zinc-300 ${
          isThumb ? "h-14 w-14" : "h-10 w-full"
        }`}
      >
        + {label}
      </button>
    );
  }

  return (
    <div className={isThumb ? "w-20" : "w-full"}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className={`rounded object-cover ${isThumb ? "max-h-20 w-20" : "max-h-52 w-full"}`}
        />
      )}
      <div className="mt-1 flex items-center gap-1">
        <input
          autoFocus={editing}
          value={url ?? ""}
          placeholder={`${label} URL (image or GIF)`}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="min-w-0 flex-1 rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 outline-none focus:bg-white/[0.08]"
        />
        {url && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setEditing(false);
            }}
            className="text-[10px] text-red-400 hover:underline"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function EmbedEditor({
  name = "payload",
  defaultValue,
  profiles = [],
  templates = [],
  onChange,
}: {
  name?: string;
  defaultValue?: DiscordMessage;
  profiles?: EditorProfile[];
  templates?: EditorTemplate[];
  onChange?: (msg: DiscordMessage) => void;
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

  // İçerik değiştikçe parent'a temiz payload'ı bildir (örn. onboarding state'i korusun).
  useEffect(() => {
    onChange?.(cleanMessage(msg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg]);

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

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const base = t.payload_json ?? {};
    // Sender profilini (mevcut username/avatar) koru — template ezmesin.
    setMsg((m) => ({
      ...base,
      username: m.username,
      avatar_url: m.avatar_url,
      embeds: base.embeds?.length ? base.embeds : [{ ...EMPTY_EMBED }],
    }));
  }

  const clean = cleanMessage(msg);

  return (
    <div className="space-y-3">
      {/* Üst araç çubuğu: şablon / profil / içe aktarma — ikincil kontroller */}
      <div className="flex flex-wrap items-center gap-2">
        {templates.length > 0 && (
          <div className="min-w-48 flex-1">
            <Select
              placeholder="Load from template…"
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              onValueChange={applyTemplate}
            />
          </div>
        )}
        {profiles.length > 0 && (
          <div className="min-w-48 flex-1">
            <Select
              placeholder="Apply sender profile…"
              options={profiles.map((p) => ({ value: p.id, label: p.name }))}
              onValueChange={(id) => {
                const p = profiles.find((x) => x.id === id);
                if (p) patch({ username: p.username ?? undefined, avatar_url: p.avatar_url ?? undefined });
              }}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-faint">
        Click any text below to edit it directly. This is exactly how it will look in Discord.
      </p>

      {/* DÜZENLENEBİLİR Discord kartı */}
      <div className="rounded-lg bg-[#313338] p-4">
        <div className="flex gap-3">
          <AvatarSlot url={msg.avatar_url} onChange={(v) => patch({ avatar_url: v })} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <input
                value={msg.username ?? ""}
                onChange={(e) => patch({ username: e.target.value || undefined })}
                placeholder="Webhook"
                className={`${FIELD} max-w-[260px] font-semibold text-white`}
              />
              <span className="rounded bg-indigo-600 px-1 text-[10px] font-bold text-white">BOT</span>
            </div>

            <AutoArea
              value={msg.content ?? ""}
              onChange={(v) => patch({ content: v || undefined })}
              placeholder="Plain message (optional)"
              className="mt-0.5 text-sm text-zinc-200"
            />

            {embeds.map((embed, i) => (
              <EmbedCard
                key={i}
                embed={embed}
                index={i}
                onPatch={(p) => patchEmbed(i, p)}
                onRemove={() => removeEmbed(i)}
                onAddField={() => addField(i)}
                onPatchField={(fi, p) => patchField(i, fi, p)}
                onRemoveField={(fi) => removeField(i, fi)}
              />
            ))}

            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={addEmbed}
              disabled={embeds.length >= 10}
            >
              + Add embed ({embeds.length}/10)
            </Button>
          </div>
        </div>
      </div>

      {/* Durum + ileri araçlar */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Total embed characters: {charCount}/6000</span>
        <a
          href={toDiscohookUrl(clean)}
          target="_blank"
          rel="noreferrer"
          className="text-primary-2 hover:underline"
        >
          Open in Discohook →
        </a>
      </div>
      {!parsed.success && (
        <p className="text-xs text-red-400">{parsed.error.issues[0]?.message ?? "Invalid message"}</p>
      )}

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-xs text-faint">
          Import from Discohook URL or JSON
        </summary>
        <div className="border-t border-border p-3">
          <Textarea
            rows={3}
            className="font-mono text-xs"
            placeholder={'discohook.org URL  ·  or  {"embeds":[{"title":"..."}]}'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <Button type="button" variant="secondary" className="mt-2" onClick={doImport}>
            Import
          </Button>
          {importError && <p className="mt-1 text-xs text-red-400">{importError}</p>}
        </div>
      </details>

      <input type="hidden" name={name} value={JSON.stringify(clean)} />
    </div>
  );
}

/** Tek bir embed'in düzenlenebilir kartı (Discord görünümü). */
function EmbedCard({
  embed,
  index,
  onPatch,
  onRemove,
  onAddField,
  onPatchField,
  onRemoveField,
}: {
  embed: Embed;
  index: number;
  onPatch: (p: Partial<Embed>) => void;
  onRemove: () => void;
  onAddField: () => void;
  onPatchField: (fi: number, p: Partial<{ name: string; value: string; inline: boolean }>) => void;
  onRemoveField: (fi: number) => void;
}) {
  const fields = embed.fields ?? [];
  return (
    <div
      className="group/embed relative mt-2 max-w-md rounded border-l-4 bg-[#2b2d31] p-3"
      style={{ borderColor: intToHex(embed.color) }}
    >
      {/* Hover araç çubuğu: renk + embed sil */}
      <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover/embed:opacity-100">
        <label
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border bg-black/20"
          title="Embed color"
        >
          <input
            type="color"
            value={intToHex(embed.color)}
            onChange={(e) => onPatch({ color: hexToInt(e.target.value) })}
            className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
        <button
          type="button"
          onClick={onRemove}
          title={`Remove embed ${index + 1}`}
          className="flex h-6 w-6 items-center justify-center rounded border border-border bg-black/20 text-xs text-red-400 hover:bg-red-500/10"
        >
          ✕
        </button>
      </div>

      {/* Thumbnail (sağ üst) */}
      <div className="float-right ml-3">
        <ImageSlot
          url={embed.thumbnail?.url}
          onChange={(v) => onPatch({ thumbnail: v ? { url: v } : undefined })}
          label="Thumb"
          variant="thumb"
        />
      </div>

      <input
        value={embed.author?.name ?? ""}
        onChange={(e) =>
          onPatch({ author: e.target.value ? { ...embed.author, name: e.target.value } : undefined })
        }
        placeholder="Author"
        className={`${FIELD} mb-1 text-xs font-semibold text-zinc-200`}
      />
      <input
        value={embed.title ?? ""}
        onChange={(e) => onPatch({ title: e.target.value || undefined })}
        placeholder="Title"
        className={`${FIELD} font-semibold text-indigo-300`}
      />
      <AutoArea
        value={embed.description ?? ""}
        onChange={(v) => onPatch({ description: v || undefined })}
        placeholder="Description"
        className="mt-1 text-sm text-zinc-300"
      />

      {/* Fields */}
      {fields.length > 0 && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fields.map((f, fi) => (
            <div
              key={fi}
              className={`group/field relative rounded ${f.inline ? "" : "sm:col-span-2"}`}
            >
              <input
                value={f.name}
                onChange={(e) => onPatchField(fi, { name: e.target.value })}
                placeholder="Field name"
                className={`${FIELD} text-xs font-semibold text-zinc-200`}
              />
              <AutoArea
                value={f.value}
                onChange={(v) => onPatchField(fi, { value: v })}
                placeholder="Field value"
                className="text-xs text-zinc-400"
              />
              <div className="mt-0.5 flex items-center gap-2 opacity-0 transition-opacity group-hover/field:opacity-100">
                <label className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={f.inline ?? false}
                    onChange={(e) => onPatchField(fi, { inline: e.target.checked })}
                  />
                  inline
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveField(fi)}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {fields.length < 25 && (
        <button
          type="button"
          onClick={onAddField}
          className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          + Add field
        </button>
      )}

      {/* Büyük görsel */}
      <div className="clear-both pt-2">
        <ImageSlot
          url={embed.image?.url}
          onChange={(v) => onPatch({ image: v ? { url: v } : undefined })}
          label="Image"
          variant="image"
        />
      </div>

      <input
        value={embed.footer?.text ?? ""}
        onChange={(e) => onPatch({ footer: e.target.value ? { text: e.target.value } : undefined })}
        placeholder="Footer"
        className={`${FIELD} mt-2 text-xs text-zinc-500`}
      />
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
