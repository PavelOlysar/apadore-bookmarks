import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { getSupabaseServer } from "@/lib/supabase/server";
import { formatPinDate } from "@/lib/date";
import type { PinWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServer();

  const [{ data, error }, { data: { user } }] = await Promise.all([
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
    supabase.auth.getUser(),
  ]);

  if (error || !data) notFound();

  const pin = {
    ...data,
    tags: (data.tags ?? []).map((t: any) => t.tag).filter(Boolean),
  } as PinWithRelations;

  const canEdit = !!user && user.id === pin.saved_by;

  return (
    <>
      <TopNav />
      <main className="page-px py-16 max-w-5xl">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="eyebrow">{formatPinDate(pin.created_at)}</div>
            <div className="eyebrow">
              {pin.category?.name?.toUpperCase() ?? "UNCATEGORIZED"}
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            {canEdit && (
              <Link href={`/pin/${id}/edit`} className="btn-ghost">Edit</Link>
            )}
            <Link href="/" className="btn-ghost">← Back</Link>
          </div>
        </div>

        <h1 className="display-2 mt-6 max-w-3xl">{pin.title ?? "Untitled"}</h1>

        {/* Media — always object-contain on a softer cream so the entire frame is visible */}
        <div
          className="mt-12 border border-rule bg-[#ece9dc] relative overflow-hidden"
          style={{ aspectRatio: "16 / 9" }}
        >
          {pin.video_url ? (
            <video
              src={pin.video_url}
              poster={pin.image_url ?? undefined}
              muted
              loop
              playsInline
              autoPlay
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : pin.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pin.image_url}
              alt={pin.title ?? ""}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-faint">
              <span className="eyebrow">No media</span>
            </div>
          )}
        </div>

        {pin.description && (
          <p className="mt-12 max-w-prose leading-relaxed text-[15.5px]">
            {pin.description}
          </p>
        )}

        {pin.tags.length > 0 && (
          <div className="mt-10 text-sm text-ink-muted">
            {pin.tags.map((t) => t.name).join(" · ")}
          </div>
        )}

        <div className="hairline-top mt-12 pt-8 flex flex-wrap items-center gap-8">
          {pin.source_url && (
            <a
              href={pin.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Open original ↗
            </a>
          )}
          {pin.saved_by_profile?.full_name && (
            <span className="text-sm text-ink-muted italic">
              Saved by {pin.saved_by_profile.full_name}
            </span>
          )}
        </div>
      </main>
    </>
  );
}
