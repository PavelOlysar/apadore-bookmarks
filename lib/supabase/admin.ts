import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

// Service-role client. Server-only. Used when we need to bypass RLS — e.g.
// the account-delete flow uses it to call auth.admin.deleteUser().
export function getSupabaseAdmin() {
  const url = serverEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error(
      "Supabase admin env vars missing — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
