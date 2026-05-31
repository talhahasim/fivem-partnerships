<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Proje: FiveM/RedM Discord Partnerlik Sistemi

FiveM/RedM mağazaları için Discord partnerlik otomasyonu. Tam mimari, akışlar ve veri
modeli için **[PLAN.md](PLAN.md)** referans alınmalı.

## Stack & kararlar
- Next.js (App Router, TS) + Supabase (Postgres + Discord OAuth + Storage).
- Hosting: Cloudflare (`@opennextjs/cloudflare`). Worker: ayrı `workers/delivery-worker` (Queue consumer + cron sweeper).
- Auth: **sadece Discord OAuth**. Bot yok (DM = Faz 2).
- Çoklu mağaza; partner başına ayrı webhook/kanal.

## Mimari kurallar
- **Webhook URL'leri AES-GCM ile şifreli** (`lib/crypto.ts`); plaintext asla DB/clientta tutulmaz.
- **Tüm Discord gönderimi server/worker tarafında** (`lib/discord.ts`); `allowed_mentions:{parse:[]}` default.
- Gönderim kuyruğu = `deliveries` tablosu; Cloudflare Queue + cron sweeper işler.
- DB şeması + RLS: `supabase/migrations/`. Worker `service_role` ile RLS bypass eder.
- Embed payload doğrulaması: `lib/embed/schema.ts` (zod + Discord limitleri).
