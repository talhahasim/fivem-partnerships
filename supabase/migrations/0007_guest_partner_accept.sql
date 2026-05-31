-- =============================================================================
-- Misafir (kayıtsız) partner kabulü.
-- Davet edilen taraf sisteme kayıtlı olmayabilir; bu durumda webhook URL'ini
-- doğrudan girerek partnerlik kurabilir. Bunun için hafif bir "guest store"
-- satırı açılır: gerçek bir auth user'a bağlı olmadığından owner_id null olur.
-- is_guest ile işaretlenir ve hiçbir kullanıcının panelinde görünmez.
-- Webhook/delivery/worker zinciri olduğu gibi çalışmaya devam eder.
-- =============================================================================
alter table stores alter column owner_id drop not null;
alter table stores add column if not exists is_guest boolean not null default false;
