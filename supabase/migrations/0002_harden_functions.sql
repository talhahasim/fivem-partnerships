-- =============================================================================
-- Fonksiyon yetki sertleştirmesi (Supabase security advisor WARN'larına karşı)
-- =============================================================================

-- set_updated_at: search_path sabitle + public EXECUTE kaldır (trigger çalışır)
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.set_updated_at() from public;

-- handle_new_user: yalnız auth.users trigger'ı üzerinden çalışır; RPC ile çağrılamasın
revoke execute on function public.handle_new_user() from public;

-- owns_store: RLS politikalarında authenticated tarafından kullanılır;
-- anon RPC ile doğrudan çağıramasın ama RLS için authenticated EXECUTE alsın
revoke execute on function public.owns_store(uuid) from public;
grant execute on function public.owns_store(uuid) to authenticated;
