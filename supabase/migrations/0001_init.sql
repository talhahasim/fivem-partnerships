-- =============================================================================
-- FiveM/RedM Discord Partnerlik Sistemi — İlk şema
-- Postgres / Supabase. Auth: Discord OAuth (auth.users).
-- =============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid(), gen_random_bytes()

-- Enums ----------------------------------------------------------------------
create type approval_mode   as enum ('auto', 'manual');
create type notify_mode     as enum ('channel', 'none');         -- 'dm' = Faz 2 (bot)
create type template_type   as enum ('partnership_intro', 'product', 'custom');
create type invite_status   as enum ('pending', 'accepted', 'revoked', 'expired');
create type partner_status  as enum ('accepted', 'revoked');
create type announce_target as enum ('all', 'selected');
create type delivery_source as enum ('intro', 'announcement');
create type delivery_status as enum ('pending', 'approved', 'sending', 'sent', 'failed', 'rejected');

-- updated_at trigger fonksiyonu ----------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- profiles  (auth.users uzantısı)
-- =============================================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  discord_id    text,
  username      text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Yeni auth.users kaydında otomatik profil oluştur (Discord metadata'sından)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, discord_id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'provider_id',
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- stores  (çoklu mağaza — bir kullanıcı birden fazla store)
-- =============================================================================
create table stores (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references profiles(id) on delete cascade,
  name              text not null,
  slug              text not null unique,
  logo_url          text,
  description       text,
  discord_guild_id  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_stores_owner on stores(owner_id);
create trigger trg_stores_updated before update on stores
  for each row execute function set_updated_at();

-- Aktif kullanıcının bir store'a sahip olup olmadığını kontrol eden yardımcı
create or replace function owns_store(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from stores s where s.id = p_store_id and s.owner_id = auth.uid()
  );
$$;

-- =============================================================================
-- webhooks  (mağazanın kendi Discord kanalları — URL şifreli)
-- =============================================================================
create table webhooks (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  label           text not null,
  url_encrypted   text not null,             -- AES-GCM ciphertext (base64); plaintext asla saklanmaz
  guild_name      text,
  channel_name    text,
  is_valid        boolean not null default true,
  last_checked_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_webhooks_store on webhooks(store_id);
create trigger trg_webhooks_updated before update on webhooks
  for each row execute function set_updated_at();

-- =============================================================================
-- templates  (kaydedilmiş embed mesajları)
-- =============================================================================
create table templates (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  name          text not null,
  type          template_type not null default 'custom',
  payload_json  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_templates_store on templates(store_id);
create trigger trg_templates_updated before update on templates
  for each row execute function set_updated_at();

-- =============================================================================
-- store_settings  (mağaza başına ayarlar)
-- =============================================================================
create table store_settings (
  store_id                  uuid primary key references stores(id) on delete cascade,
  approval_mode             approval_mode not null default 'manual',
  notify_mode               notify_mode   not null default 'channel',
  notify_webhook_id         uuid references webhooks(id) on delete set null,
  default_intro_template_id uuid references templates(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger trg_store_settings_updated before update on store_settings
  for each row execute function set_updated_at();

-- =============================================================================
-- invites  (partnerlik davet linkleri)
-- =============================================================================
create table invites (
  id                      uuid primary key default gen_random_uuid(),
  token                   text not null unique default encode(gen_random_bytes(24), 'hex'),
  inviter_store_id        uuid not null references stores(id) on delete cascade,
  inviter_webhook_id      uuid references webhooks(id) on delete set null,
  inviter_intro_template_id uuid references templates(id) on delete set null,
  status                  invite_status not null default 'pending',
  expires_at              timestamptz,
  used_at                 timestamptz,
  created_at              timestamptz not null default now()
);
create index idx_invites_inviter on invites(inviter_store_id);
create index idx_invites_token on invites(token);

-- =============================================================================
-- partnerships  (kabul edilmiş iki taraflı ilişki)
-- =============================================================================
create table partnerships (
  id                    uuid primary key default gen_random_uuid(),
  inviter_store_id      uuid not null references stores(id) on delete cascade,
  invitee_store_id      uuid not null references stores(id) on delete cascade,
  status                partner_status not null default 'accepted',
  inviter_webhook_id    uuid references webhooks(id) on delete set null, -- invitee'nin mesajını alan kanal (inviter'da)
  invitee_webhook_id    uuid references webhooks(id) on delete set null, -- inviter'ın mesajını alan kanal (invitee'de)
  inviter_intro_payload jsonb,   -- inviter'ın invitee kanalına gönderdiği intro snapshot
  invitee_intro_payload jsonb,   -- invitee'nin inviter kanalına gönderdiği intro snapshot
  accepted_at           timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint uniq_partnership unique (inviter_store_id, invitee_store_id),
  constraint no_self_partner check (inviter_store_id <> invitee_store_id)
);
create index idx_partnerships_inviter on partnerships(inviter_store_id);
create index idx_partnerships_invitee on partnerships(invitee_store_id);
create trigger trg_partnerships_updated before update on partnerships
  for each row execute function set_updated_at();

-- =============================================================================
-- announcements  (ürün/duyuru broadcast'leri)
-- =============================================================================
create table announcements (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  title         text not null,
  payload_json  jsonb not null,
  target        announce_target not null default 'all',
  created_at    timestamptz not null default now()
);
create index idx_announcements_store on announcements(store_id);

-- =============================================================================
-- deliveries  (kuyruk — tek webhook'a tek gönderim)
-- =============================================================================
create table deliveries (
  id                 uuid primary key default gen_random_uuid(),
  sender_store_id    uuid not null references stores(id) on delete cascade,
  recipient_store_id uuid not null references stores(id) on delete cascade,
  partnership_id     uuid references partnerships(id) on delete set null,
  webhook_id         uuid not null references webhooks(id) on delete cascade,  -- alıcının webhook'u
  source_type        delivery_source not null,
  source_id          uuid,             -- announcement.id veya partnership.id
  payload_json       jsonb not null,   -- gönderilecek mesajın snapshot'ı
  status             delivery_status not null default 'pending',
  approved_at        timestamptz,
  sent_at            timestamptz,
  discord_message_id text,
  error              text,
  attempts           int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_deliveries_recipient on deliveries(recipient_store_id);
create index idx_deliveries_sender on deliveries(sender_store_id);
create index idx_deliveries_status on deliveries(status);
-- Worker sweeper'ının çekeceği gönderilebilir kayıtlar için kısmi index
create index idx_deliveries_queue on deliveries(status, updated_at)
  where status in ('approved', 'sending');
create trigger trg_deliveries_updated before update on deliveries
  for each row execute function set_updated_at();

-- =============================================================================
-- notifications  (site içi çan)
-- =============================================================================
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  type        text not null,
  data_json   jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_notifications_store on notifications(store_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- Not: service_role anahtarı RLS'i bypass eder (Cloudflare worker bunu kullanır).
-- =============================================================================
alter table profiles       enable row level security;
alter table stores         enable row level security;
alter table webhooks       enable row level security;
alter table templates      enable row level security;
alter table store_settings enable row level security;
alter table invites        enable row level security;
alter table partnerships   enable row level security;
alter table announcements  enable row level security;
alter table deliveries     enable row level security;
alter table notifications  enable row level security;

-- profiles: kendi profilini gör/güncelle ------------------------------------
create policy profiles_self_select on profiles for select using (id = auth.uid());
create policy profiles_self_update on profiles for update using (id = auth.uid());

-- stores: sahibi tam erişim --------------------------------------------------
create policy stores_owner_all on stores for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Partnerlik kurulumunda partnerin temel mağaza bilgisi okunabilsin
create policy stores_partner_select on stores for select
  using (
    exists (
      select 1 from partnerships p
      where (p.inviter_store_id = stores.id and owns_store(p.invitee_store_id))
         or (p.invitee_store_id = stores.id and owns_store(p.inviter_store_id))
    )
  );

-- store-scoped tablolar için ortak: owns_store(store_id) -----------------------
create policy webhooks_owner_all on webhooks for all
  using (owns_store(store_id)) with check (owns_store(store_id));

create policy templates_owner_all on templates for all
  using (owns_store(store_id)) with check (owns_store(store_id));

create policy store_settings_owner_all on store_settings for all
  using (owns_store(store_id)) with check (owns_store(store_id));

create policy announcements_owner_all on announcements for all
  using (owns_store(store_id)) with check (owns_store(store_id));

create policy notifications_owner_all on notifications for all
  using (owns_store(store_id)) with check (owns_store(store_id));

-- invites: davet eden tam erişim; token ile okuma uygulama katmanında (service_role)
create policy invites_owner_all on invites for all
  using (owns_store(inviter_store_id)) with check (owns_store(inviter_store_id));

-- partnerships: iki taraftan biri okuyabilir; düzenleme service_role/uygulama üzerinden
create policy partnerships_party_select on partnerships for select
  using (owns_store(inviter_store_id) or owns_store(invitee_store_id));
create policy partnerships_party_update on partnerships for update
  using (owns_store(inviter_store_id) or owns_store(invitee_store_id))
  with check (owns_store(inviter_store_id) or owns_store(invitee_store_id));

-- deliveries: gönderen gönderdiğini, alıcı kendine geleni görür; alıcı onaylar
create policy deliveries_party_select on deliveries for select
  using (owns_store(sender_store_id) or owns_store(recipient_store_id));
-- Alıcı kendi pending delivery'sini onaylayabilir/reddedebilir (status güncelleme)
create policy deliveries_recipient_update on deliveries for update
  using (owns_store(recipient_store_id)) with check (owns_store(recipient_store_id));
