# Partner — FiveM/RedM Discord Partnership Automation

Collect your partner channels' webhooks in one place and broadcast polished embed
announcements to all of them at once — no bot required.

Built for FiveM/RedM store owners who run cross-server Discord partnerships.

## Features

- **Discord OAuth** sign-in (Supabase Auth), multi-store support with a store switcher
- **Channel webhooks** — add a Discord webhook; the URL is stored **AES-256-GCM encrypted** (AAD bound to the store)
- **Partnership invites** — generate a link; each side picks the channel that receives the other's posts
- **Reciprocal intros** — on accept, both stores' intro messages are sent to each other's channels
- **Approval flow** — incoming partner messages post automatically or wait for your approval (per-store setting)
- **Announcement broadcasts** — send a product/announcement embed to all/selected partners, and to your own channels
- **Embed editor** — Discord-style live preview, validation against Discord limits, discohook URL / raw JSON import, and a starter template gallery
- **Sender profiles** — save a webhook name + avatar once and reuse it
- **Forum channels** — target an assigned forum post (`thread_id`); new posts are never created
- **Delivery queue** — Cloudflare Queue consumer + cron sweeper with retry/backoff; failures surface in the dashboard

## Stack

- **Next.js** (App Router, TS) + Tailwind v4
- **Supabase** — Postgres, Auth (Discord), RLS
- **Cloudflare** — `@opennextjs/cloudflare` hosting + Queues/Cron worker (`workers/delivery-worker`)
- Icons: `@iconscout/react-unicons`

See **[PLAN.md](PLAN.md)** for the full architecture and **[SECURITY-AUDIT.md](SECURITY-AUDIT.md)** for the security model.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

Required environment variables (`.env.local`):

| Var | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server/worker only) |
| `WEBHOOK_ENC_KEY` | 32-byte base64 key for webhook URL encryption |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. `http://localhost:3000`) |

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Apply the database schema from `supabase/migrations/` (via the Supabase SQL editor, CLI, or MCP), then
enable the **Discord** auth provider in your Supabase project.

## Security notes

- Webhook URLs are never stored or sent to the client in plaintext.
- All Discord sending happens server/worker-side with `allowed_mentions: { parse: [] }` (no `@everyone` abuse).
- SSRF-guarded: only `discord.com` webhook hosts are allowed.
- Row Level Security on every table.

## License

MIT
