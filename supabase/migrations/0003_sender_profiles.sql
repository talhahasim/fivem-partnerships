-- =============================================================================
-- Gönderen kimlik profilleri (sabit webhook adı + avatar)
-- =============================================================================
create table sender_profiles (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  name        text not null,
  username    text,
  avatar_url  text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_sender_profiles_store on sender_profiles(store_id);

alter table sender_profiles enable row level security;
create policy sender_profiles_owner_all on sender_profiles for all
  using (owns_store(store_id)) with check (owns_store(store_id));
