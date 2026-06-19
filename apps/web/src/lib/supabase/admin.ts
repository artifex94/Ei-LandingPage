import { createClient } from "@supabase/supabase-js";

// Cliente con service_role — bypasea RLS
// SOLO usar desde Server Actions del admin — NUNCA exponer al browser
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
