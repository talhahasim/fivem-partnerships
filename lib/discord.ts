/**
 * Discord webhook yardımcıları — doğrulama + gönderim.
 * Bot YOK; düz fetch ile webhook çağrısı. Yalnızca server/worker'da kullanılır.
 */

const ALLOWED_HOSTS = new Set(["discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com"]);

export type DiscordWebhookMeta = {
  id: string;
  name: string | null;
  channel_id: string | null;
  guild_id: string | null;
};

/** SSRF koruması: yalnızca gerçek Discord webhook URL'lerine izin ver. */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (!ALLOWED_HOSTS.has(u.hostname)) return false;
    return /^\/api(\/v\d+)?\/webhooks\/\d+\/[\w-]+$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** Webhook'u doğrula ve metadata'sını döndür (kaydetmeden önce). */
export async function validateWebhook(url: string): Promise<DiscordWebhookMeta | null> {
  if (!isValidWebhookUrl(url)) return null;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: String(data.id ?? ""),
    name: (data.name as string) ?? null,
    channel_id: (data.channel_id as string) ?? null,
    guild_id: (data.guild_id as string) ?? null,
  };
}

/** Forum post (thread) linki veya çıplak id'den thread_id çıkarır. */
export function parseThreadId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = /channels\/(?:\d+|@me)\/(\d+)/.exec(s);
  if (m) return m[1];
  const bare = /^(\d{17,21})$/.exec(s);
  return bare ? bare[1] : null;
}

/** Discord mesaj linkinden channel + message id ayrıştırır. Çıplak message id de kabul eder. */
export function parseMessageLink(input: string): { channelId: string; messageId: string } | null {
  const s = input.trim();
  const m = /channels\/(?:\d+|@me)\/(\d+)\/(\d+)/.exec(s);
  if (m) return { channelId: m[1], messageId: m[2] };
  const bare = /^(\d{17,21})$/.exec(s);
  if (bare) return { channelId: "", messageId: bare[1] };
  return null;
}

/**
 * Bir webhook'un GÖNDERDİĞİ mesajı geri okur:
 *   GET /webhooks/{id}/{token}/messages/{messageId}
 * Discord yalnız o webhook'un kendi attığı mesajı döndürür (başkası attıysa 404).
 */
export async function fetchWebhookMessage(
  webhookUrl: string,
  messageId: string,
): Promise<Record<string, unknown> | null> {
  if (!isValidWebhookUrl(webhookUrl)) return null;
  const res = await fetch(`${webhookUrl}/messages/${messageId}`, { method: "GET" });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

export type SendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; retryable: boolean; retryAfterMs?: number; error: string };

/**
 * Webhook'a mesaj gönderir. allowed_mentions default kapalı (partner @everyone pingleyemez).
 * ?wait=true ile gönderir → dönen mesaj id'sini alır.
 */
export async function sendWebhookMessage(
  url: string,
  payload: Record<string, unknown>,
  threadId?: string | null,
): Promise<SendResult> {
  if (!isValidWebhookUrl(url)) {
    return { ok: false, retryable: false, error: "Geçersiz webhook URL" };
  }

  // allowed_mentions EN SONA yazılır: payload içinde gelse bile ezilemez
  // (partner senin kanalında @everyone/@here/rol pingleyemez).
  const body = {
    ...payload,
    allowed_mentions: { parse: [] as string[] },
  };

  // Forum/post kanalı için thread_id (mevcut posta yazar). thread_name YOK → yeni post açmaz.
  const target = new URL(url);
  target.searchParams.set("wait", "true");
  if (threadId) target.searchParams.set("thread_id", threadId);

  const res = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
    return { ok: false, retryable: true, retryAfterMs: retryAfter * 1000, error: "rate_limited" };
  }

  // Webhook silinmiş / geçersiz → kalıcı hata
  if (res.status === 404 || res.status === 401 || res.status === 403) {
    return { ok: false, retryable: false, error: `webhook_invalid_${res.status}` };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Forum kanalı + thread yok → net, okunaklı hata (yeni post AÇMIYORUZ)
    if (res.status === 400 && /thread_name or thread_id/i.test(text)) {
      return {
        ok: false,
        retryable: false,
        error: "This is a forum/post channel — assign a forum post for this partner (no post was created).",
      };
    }
    // 5xx → tekrar denenebilir, diğer 4xx → kalıcı
    return { ok: false, retryable: res.status >= 500, error: `${res.status}: ${text.slice(0, 200)}` };
  }

  const data = (await res.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, messageId: data?.id ?? null };
}
