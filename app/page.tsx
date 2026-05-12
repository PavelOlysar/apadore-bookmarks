import { PinGrid } from "@/components/PinGrid";
import { TopNav } from "@/components/TopNav";
import { getSupabaseServer } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import type { PinWithRelations } from "@/lib/types";

// Always render at request time — uses cookies() via Supabase.
// Without this, the OpenNext Cloudflare adapter tries to pre-render
// and crashes because `cookies()` isn't available at build time.
export const dynamic = "force-dynamic";

type LoadResult =
  | { ok: true; pins: PinWithRelations[] }
  | { ok: false; reason: "missing-env"; missing: string[] }
  | { ok: false; reason: "query-failed"; message: string };

async function loadPins(): Promise<LoadResult> {
  const missing: string[] = [];
  if (!serverEnv("NEXT_PUBLIC_SUPABASE_URL")) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serverEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) return { ok: false, reason: "missing-env", missing };

  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("pins")
      .select(`
        *,
        category:categories(*),
        saved_by_profile:profiles!pins_saved_by_fkey(id, full_name, avatar_url),
        tags:pin_tags(tag:tags(*))
      `)
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) {
      console.error("[loadPins] supabase query error:", error);
      return { ok: false, reason: "query-failed", message: error.message };
    }

    const pins = (data ?? []).map((row: any) => ({
      ...row,
      tags: (row.tags ?? []).map((t: any) => t.tag).filter(Boolean),
    })) as PinWithRelations[];

    return { ok: true, pins };
  } catch (err: any) {
    console.error("[loadPins] threw:", err);
    return {
      ok: false,
      reason: "query-failed",
      message: err?.message ?? String(err),
    };
  }
}

export default async function HomePage() {
  const result = await loadPins();

  return (
    <>
      <TopNav />
      <main className="page-px pt-10 pb-24">
        {result.ok ? (
          <PinGrid pins={result.pins} />
        ) : (
          <ErrorBlock result={result} />
        )}
      </main>
      <footer className="hairline-top py-10">
        <div className="page-px flex items-center justify-between">
          <span className="eyebrow">Apadore · Internal</span>
          <span className="eyebrow">{new Date().getFullYear()}</span>
        </div>
      </footer>
    </>
  );
}

function ErrorBlock({ result }: { result: Exclude<LoadResult, { ok: true }> }) {
  if (result.reason === "missing-env") {
    return (
      <div className="py-24 max-w-xl">
        <div className="eyebrow text-red-700">Configuration missing</div>
        <p className="display-2 mt-3">Can't reach Supabase.</p>
        <p className="mt-4 text-sm text-ink-muted">
          The following environment variables aren't visible to the server:
        </p>
        <ul className="mt-3 text-sm space-y-1">
          {result.missing.map((name) => (
            <li key={name} className="font-mono">{name}</li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-muted">
          On Cloudflare: dashboard → Workers & Pages → apadore-bookmarks → Settings → Variables and Secrets. Locally: <span className="font-mono">.env.local</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="py-24 max-w-xl">
      <div className="eyebrow text-red-700">Supabase query failed</div>
      <p className="display-2 mt-3">Couldn't load pins.</p>
      <pre className="mt-6 p-4 border border-rule bg-paper-card text-xs whitespace-pre-wrap break-all">
        {result.message}
      </pre>
    </div>
  );
}
