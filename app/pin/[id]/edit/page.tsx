import { notFound, redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NewPinForm } from "@/app/new/NewPinForm";
import { updatePinAction, deletePinAction } from "./actions";
import { DeletePinButton } from "./DeletePinButton";
import type { Category, Tag, PinWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [pinRes, catsRes, tagsRes] = await Promise.all([
    supabase
      .from("pins")
      .select(`
        *,
        category:categories(*),
        saved_by_profile:profiles!pins_saved_by_fkey(id, full_name, avatar_url),
        tags:pin_tags(tag:tags(*))
      `)
      .eq("id", id)
      .single(),
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("tags").select("id, name, slug").order("name"),
  ]);

  if (pinRes.error || !pinRes.data) notFound();
  if (pinRes.data.saved_by !== user.id) {
    // Not the owner — bounce to detail view (read-only).
    redirect(`/pin/${id}`);
  }

  const pin = {
    ...pinRes.data,
    tags: (pinRes.data.tags ?? []).map((t: any) => t.tag).filter(Boolean),
  } as PinWithRelations;

  const boundUpdate = updatePinAction.bind(null, id);
  const boundDelete = deletePinAction.bind(null, id);

  return (
    <>
      <TopNav />
      <main className="page-px py-12 max-w-5xl">
        <div className="eyebrow">Edit</div>
        <h1 className="display-2 mt-3">Edit pin</h1>

        <div className="hairline-top mt-10" />

        <NewPinForm
          categories={(catsRes.data ?? []) as Category[]}
          tags={(tagsRes.data ?? []) as Tag[]}
          initialPin={pin}
          submitAction={boundUpdate}
          submitLabel="Save changes"
          cancelHref={`/pin/${id}`}
        />

        <div className="hairline-top mt-16" />

        <section className="mt-12">
          <div className="eyebrow text-red-700">Danger zone</div>
          <DeletePinButton deleteAction={boundDelete} />
        </section>
      </main>
    </>
  );
}
