-- =============================================================================
-- Webhook için varsayılan forum post (thread)
-- Partnerlik bazında thread verilmezse delivery bu thread'e gönderilir.
-- =============================================================================
alter table webhooks add column if not exists thread_id text;
