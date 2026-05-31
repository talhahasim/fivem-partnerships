/**
 * Discohook (discohook.org) `?data=` formatı ile import/export.
 * Format: base64( JSON ) → { messages: [{ data: { content, embeds, username, avatar_url } }] }
 */
import { messageSchema, type DiscordMessage } from "@/lib/embed/schema";

// UTF-8 güvenli base64 (Türkçe/emoji karakterleri btoa'yı patlatmasın).
function b64decode(input: string): string {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function b64encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Esnek import. Kabul eder:
 *  - discohook.org URL (?data=...)
 *  - çıplak base64 "data"
 *  - ham JSON: tam mesaj {content,embeds,...}, tek embed {title,...}, embed dizisi [...],
 *    ya da discohook zarfı {messages:[{data:...}]}
 */
export function importFromDiscohook(input: string): DiscordMessage | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    let jsonStr: string;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      jsonStr = raw; // doğrudan JSON
    } else if (raw.startsWith("http")) {
      const url = new URL(raw);
      const data = url.searchParams.get("data") ?? "";
      if (!data) return null;
      jsonStr = b64decode(data);
    } else {
      jsonStr = b64decode(raw); // çıplak base64
    }
    return normalizeToMessage(JSON.parse(jsonStr));
  } catch {
    return null;
  }
}

/** Çeşitli JSON şekillerini DiscordMessage'a indirger ve doğrular. */
function normalizeToMessage(json: unknown): DiscordMessage | null {
  let m: Record<string, unknown> | null = null;

  if (Array.isArray(json)) {
    m = { embeds: json }; // embed dizisi
  } else if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    const messages = o.messages as Array<{ data?: unknown }> | undefined;
    if (messages?.[0]?.data && typeof messages[0].data === "object") {
      m = messages[0].data as Record<string, unknown>;
    } else if (o.data && typeof o.data === "object") {
      m = o.data as Record<string, unknown>;
    } else if (o.embeds || o.content !== undefined || o.username || o.avatar_url) {
      m = o; // tam mesaj
    } else if (o.title || o.description || o.fields || o.color !== undefined || o.footer || o.author) {
      m = { embeds: [o] }; // tek embed objesi
    } else {
      m = o;
    }
  }
  if (!m) return null;

  const candidate = {
    content: typeof m.content === "string" ? m.content || undefined : undefined,
    username: typeof m.username === "string" ? m.username || undefined : undefined,
    avatar_url: typeof m.avatar_url === "string" ? m.avatar_url || undefined : undefined,
    embeds: Array.isArray(m.embeds) ? m.embeds : undefined,
  };
  const parsed = messageSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** DiscordMessage'ı discohook.org editör URL'ine çevirir. */
export function toDiscohookUrl(message: DiscordMessage): string {
  const payload = { messages: [{ data: message }] };
  const data = b64encode(JSON.stringify(payload));
  return `https://discohook.org/?data=${data}`;
}
