import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NewPinForm } from "./NewPinForm";
import type { Category, Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewPinPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("tags").select("id, name, slug").order("name"),
  ]);

  return (
    <>
      <TopNav />
      <main className="page-px py-12 max-w-5xl">
        <div className="eyebrow">Add</div>
        <h1 className="display-2 mt-3">Save an inspiration</h1>
        <p className="mt-3 text-sm text-ink-muted max-w-md">
          Paste a URL to auto-fetch the title and image, or upload your own. Everything except an image-or-URL is optional.
        </p>

        <div className="hairline-top mt-10" />

        <NewPinForm
          categories={(categories ?? []) as Category[]}
          tags={(tags ?? []) as Tag[]}
        />
      </main>
    </>
  );
}
