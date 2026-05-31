# FiveM/RedM Discord Partnerlik Sistemi — Plan

FiveM/RedM store sahipleri için Discord partnerlik otomasyonu. Mağazalar birbirinin
Discord'unda partnerlik kanalı tutar; sistem her kanalın webhook'unu toplar ve yeni
ürün/duyuru çıkınca partner kanallarına embed mesaj atar.

## Çekirdek Akış (özet)

Mağaza A partnerlik davet linki üretir → B linke girip kendi webhook'unu + partnerlik
mesajını girer → kabul edilince iki tarafın intro mesajı **karşılıklı** birbirinin
webhook'una gider → sonradan ürün duyuruları seçili/tüm partner webhook'larına broadcast edilir.

**Onay modeli:** Mesajı **ALAN** tarafın ayarı, mesajın kendi kanalına anında mı yoksa
onaydan sonra mı düşeceğini belirler — `auto` (anında) veya `manual` (pending → onay → gönder).

---

## Kararlar

| Konu | Karar |
|---|---|
| Stack | Next.js (App Router, TS) + Supabase (Postgres + Auth + Storage) |
| Auth | **Sadece Discord OAuth** (Supabase Discord provider) |
| Bot | **Yok** — sadece webhook. DM bildirimi bot gerektirir → Faz 2 |
| Ücretlendirme | Şimdilik yok (mimari ileride plan eklenebilir) |
| V1 kapsamı | Tam (şablonlar, karşılıklı gönderim, oto/manuel onay, bildirim) |
| Mağaza | **Çoklu mağaza** — kullanıcı birden fazla store yönetir + store switcher |
| Kanal yapısı | **Partner başına ayrı webhook/kanal** |
| Hosting | Cloudflare — Next.js `@opennextjs/cloudflare` |
| Worker | Cloudflare Queues (consumer) + Cron Trigger (1dk sweeper) |
| Şifreleme | Web Crypto API AES-GCM (Worker'da native) |
| E-posta | V1'de yok (site içi çan + kanal webhook bildirimi) |
| Editör referansı | discohook.org (embed builder + canlı önizleme, `data` param import/export) |

---

## Terminoloji

| Terim | Anlamı |
|---|---|
| **Store** | Sistemi kullanan FiveM/RedM dükkanı. Bir kullanıcıya ait (çoklu olabilir). |
| **Webhook** | Mağazanın kendi Discord kanalına bağlı Discord webhook URL'i (şifreli saklanır). |
| **Partnership** | İki mağaza arası ilişki. Davet linkiyle kurulur; her tarafın webhook'unu + intro mesajını tutar. |
| **Invite** | Partnerliği başlatan tek kullanımlık token'lı link. |
| **Template** | Kaydedilmiş embed mesajı (partnership_intro / product / custom). |
| **Announcement** | Tüm/seçili partnerlere broadcast edilen duyuru embed'i. |
| **Delivery** | Tek webhook'a tek gönderim kaydı. pending/approved/sent/failed/rejected. Sistemin kuyruğu. |

---

## Uçtan Uca Akışlar

### A — Onboarding
1. Discord OAuth → `profiles` + ilk `stores` kaydı.
2. Kurulum sihirbazı: mağaza adı, logo, açıklama.
3. İlk webhook: URL yapıştır → sunucu `GET <webhook>` ile doğrular (name/channel_id/guild_id döner)
   → AES-GCM ile şifreli saklanır; UI'da yalnız kanal/sunucu adı görünür.

### B — Partnerlik Daveti Oluşturma
1. A "Yeni Partnerlik" → bu partnerlik için A'nın hangi webhook'unun (kanalının) partnerin
   mesajlarını alacağını seçer (mevcut webhook veya yeni ekle).
2. A intro mesajını düzenler (default şablondan).
3. `invites` tablosunda token üretilir → `/invite/[token]` linki kopyalanır, A bunu B'ye iletir.

### C — Daveti Kabul Etme
1. B `/invite/[token]`'i açar → A'nın mağaza bilgisi + intro önizlemesi.
2. B Discord ile giriş yapar.
3. B kendi webhook'unu seçer/ekler + intro mesajını düzenler.
4. **Kabul** → `partnerships.status='accepted'`. İki delivery oluşur:
   - A intro → **B webhook** (B onay ayarına tabi)
   - B intro → **A webhook** (A onay ayarına tabi)
5. Onay ekranında her iki intro karşılıklı önizlenir; gönderim tetiklenir.

### D — Onay (auto vs manual)
- Alıcı `auto` → delivery anında Queue'ya, consumer gönderir.
- Alıcı `manual` → delivery `pending`; alıcıya bildirim (kanal webhook + site içi çan).
  Alıcı pending kuyruğunda embed'i önizler → **Onayla** (Queue'ya) / **Reddet** (iptal).

### E — Ürün/Duyuru Broadcast
1. A duyuru embed'i hazırlar → "tüm" veya "seçili" partnerler.
2. Her partnerlik için delivery oluşur (partner webhook'una, partner onay ayarına tabi).
3. Dashboard partner bazında durum: sent / pending / failed.

### F — Ayarlar
- `approval_mode`: auto / manual
- `notify_mode`: belirlenen kanala webhook / none (DM = Faz 2)
- default partnership intro şablonu

---

## Veri Modeli

```
profiles        id(=auth.users), discord_id, username, avatar_url
stores          id, owner_id→profiles, name, slug, logo_url, description, discord_guild_id
store_settings  store_id, approval_mode, notify_mode, notify_webhook_id→webhooks,
                default_intro_template_id→templates
webhooks        id, store_id, label, url_encrypted, guild_name, channel_name,
                is_valid, last_checked_at
templates       id, store_id, name, type, payload_json
invites         id, token(unique), inviter_store_id, inviter_webhook_id,
                inviter_intro_template_id, status, expires_at, used_at
partnerships    id, inviter_store_id, invitee_store_id, status,
                inviter_webhook_id, invitee_webhook_id,
                inviter_intro_payload, invitee_intro_payload, accepted_at
announcements   id, store_id, title, payload_json, target
deliveries      id, sender_store_id, recipient_store_id, partnership_id, webhook_id,
                source_type, source_id, payload_json, status,
                approved_at, sent_at, discord_message_id, error, attempts
notifications   id, store_id, type, data_json, read_at
```

**RLS:** Mağaza sahibi yalnız kendi `owner_id` verisini görür. `deliveries`'te özel kural:
alıcı kendisine gelen `pending` kayıtları görür/onaylar; gönderen kendi gönderdiklerini görür.
`invites` token ile sınırlı public okuma (yalnız davet eden mağaza bilgisi).

---

## Mimari

- Next.js App Router + TS + Tailwind + shadcn/ui.
- **Tüm webhook gönderimi server-side**; URL asla client'a gitmez.
- **Worker (Cloudflare):**
  ```
  Auto delivery   → oluşturulunca Cloudflare Queue'ya push → Consumer Worker Discord'a gönderir
  Manual delivery → pending → onaylanınca Queue'ya push
  Cron Trigger(1dk) → sweeper: takılan/retry bekleyen/yeni approved delivery'leri re-enqueue
  ```
- **Retry/backoff:** Cloudflare Queues built-in retry + `max_retries`; kalıcı hata → `failed`.
- **Rate-limit:** Discord 5/2sn, ~30/dk per webhook; 429 → `Retry-After` ile geri kuyruğa.
- **Şifreleme:** Web Crypto AES-GCM, anahtar env'de; yalnız Worker/server decrypt eder.
- **Validasyon:** zod ile embed payload + Discord limitleri.
- discord.js gerekmez (bot yok) — düz `fetch()`.

### Klasör yapısı
```
app/
  (auth)/login
  (dashboard)/dashboard | partnerships | webhooks | templates | announcements | settings
  invite/[token]/
  api/
    webhooks/validate
    invites/[token]/accept
    deliveries/[id]/approve | reject
    worker/process-deliveries   # cron sweeper hedefi
lib/
  supabase/        # server + client + middleware
  crypto.ts        # AES-GCM encrypt/decrypt (Web Crypto)
  discord.ts       # send(), validateWebhook(), rate-limit, allowed_mentions
  embed/schema.ts  # zod + Discord limitleri
  embed/discohook.ts  # discohook data param import/export
components/embed-editor/  # form + Discord-style live preview
workers/
  queue-consumer/  # Cloudflare Queue consumer (delivery gönderimi)
supabase/migrations/
```

---

## Embed Editör (discohook benzeri)

- Form: `content`, ≤10 embed (title/desc/url/color/author/footer/fields≤25/images/thumbnail/timestamp),
  `username`/`avatar_url` override.
- Discord-style **canlı önizleme**.
- **Limitler:** title 256, desc 4096, field name 256 / value 1024, footer 2048,
  toplam 6000 karakter, 10 embed.
- **Discohook uyumu:** `?data=base64(json)` import/export.

---

## Güvenlik

- Webhook URL'leri **at-rest şifreli**; UI'da yalnız kanal/sunucu adı.
- **`allowed_mentions:{parse:[]}` default** → partner senin kanalında `@everyone`/rol pingleyemez.
- **SSRF:** yalnız `https://discord.com/api/webhooks/...` (+ `discordapp.com`); kayıt öncesi `GET` doğrulama.
- **Manuel onay** = istenmeyen içeriğe karşı asıl savunma.
- **Revoke:** partnerliği pasifleştirir, ileri gönderimi durdurur.
- Invite token: 32-byte random, expiry + tek kullanım, rate-limit.

---

## Yol Haritası (V1 = tam kapsam, milestone'lar)

| # | Milestone |
|---|---|
| M0 | Cloudflare + Next.js (`@opennextjs/cloudflare`) + Supabase kurulumu, env, migration, RLS |
| M1 | Discord OAuth + çoklu mağaza + store switcher + onboarding |
| M2 | Webhook yönetimi (ekle/doğrula/şifrele/listele) |
| M3 | Embed editör (form + canlı önizleme + zod + discohook import) |
| M4 | Şablonlar (intro/ürün CRUD, default intro) |
| M5 | Davet + Partnerlik (token link, /invite/[token], partner başına webhook, karşılıklı intro) |
| M6 | Cloudflare Queues consumer + Cron sweeper + AES-GCM + retry |
| M7 | Onay sistemi (pending kuyruğu, onayla/reddet) |
| M8 | Bildirimler (kanal webhook + site içi çan) |
| M9 | Broadcast (duyuru → seçili/tüm partner + durum paneli) |
| M10 | Dashboard, delivery geçmişi, hata yönetimi, cila |

**Faz 2:** Discord botu (DM bildirimi), ücretli planlar, gelişmiş partner doğrulama.
