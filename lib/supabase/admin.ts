import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role istemci — RLS'i BYPASS eder.
 * Yalnızca güvenilir server/worker kodunda kullan (invite kabul akışı, delivery worker).
 * ASLA client component'e import etme.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
