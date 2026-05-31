-- =============================================================================
-- Forum/post kanalı hedefleri
-- Partnere atanmış MEVCUT forum postuna (thread_id) gönderim için.
-- thread_name ASLA kullanılmaz → yeni forum postu açılmaz; yalnız atanmış posta yazılır.
-- =============================================================================
alter table invites      add column if not exists inviter_thread_id text;
alter table partnerships add column if not exists inviter_thread_id text;
alter table partnerships add column if not exists invitee_thread_id text;
alter table deliveries   add column if not exists thread_id text;
