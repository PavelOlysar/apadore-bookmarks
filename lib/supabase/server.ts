import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  const url = serverEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = serverEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set.",
    );
  }
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll from a Server Component is a no-op; middleware refreshes the session.
        }
      },
    },
  });
}
