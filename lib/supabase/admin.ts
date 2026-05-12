import { createClient } from "@supabase/supabase-js";

// Service-role client. Server-only. Used when we need to bypass RLS — e.g.
// the invite-code-gated signup flow needs to verify the code on the server
// before creating the auth user.
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
