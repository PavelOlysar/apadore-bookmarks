import { PinGrid } from "@/components/PinGrid";
import { TopNav } from "@/components/TopNav";
import { getSupabaseServer } from "@/lib/supabase/server";
import { samplePins } from "@/lib/sample";
import type { PinWithRelations } from "@/lib/types";

async function loadPins(): Promise<PinWithRelations[]> {
  // Fallback to sample data when Supabase env vars aren't set yet — keeps the
  // visual reviewable before the backend is wired up.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return samplePins;
  }

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
    console.error(error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    tags: (row.tags ?? []).map((t: any) => t.tag).filter(Boolean),
  }));
}

export default async function HomePage() {
  const pins = await loadPins();

  return (
    <>
      <TopNav />
      <main className="page-px pt-10 pb-24">
        <PinGrid pins={pins} />
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
