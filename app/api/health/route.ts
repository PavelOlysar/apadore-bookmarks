import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

// Diagnostic endpoint. Doesn't leak secrets — only reports which env vars are
// visible to the runtime + a short hint of their shape.
//
// Visit:  /api/health
export async function GET() {
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "INVITE_CODE",
  ];

  const report: Record<string, { set: boolean; length: number; preview: string | null }> = {};
  for (const name of names) {
    const v = serverEnv(name);
    report[name] = {
      set: !!v,
      length: v?.length ?? 0,
      preview: v ? v.slice(0, 8) + "…" : null,
    };
  }

  // Also try to detect whether we're inside a Cloudflare context.
  let cloudflareContext: "available" | "unavailable" = "unavailable";
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env) cloudflareContext = "available";
  } catch {
    // not available
  }

  return NextResponse.json(
    {
      ok: true,
      cloudflareContext,
      env: report,
      runtime: typeof navigator !== "undefined" ? (navigator as any)?.userAgent : "unknown",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
