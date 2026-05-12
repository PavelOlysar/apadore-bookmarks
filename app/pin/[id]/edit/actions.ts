"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { inferSize } from "@/lib/size";
import type { CreatePinState } from "@/app/new/actions";
import type { PinSize } from "@/lib/types";

const ALLOWED_SIZES: PinSize[] = ["small", "medium", "wide", "tall", "large"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// updatePinAction — bound with the pin id from the edit page
// ---------------------------------------------------------------------------

export async function updatePinAction(
  pinId: string,
  _prev: CreatePinState,
  formData: FormData,
): Promise<CreatePinState> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  // Verify ownership before doing anything.
  const { data: existing, error: fetchErr } = await supabase
    .from("pins")
    .select("id, saved_by")
    .eq("id", pinId)
    .single();
  if (fetchErr || !existing) return { error: "Pin not found." };
  if (existing.saved_by !== user.id) {
    return { error: "You can only edit pins you saved." };
  }

  // Parse fields
  const source_url = (formData.get("source_url") as string | null)?.trim() || null;
  const image_url = (formData.get("image_url") as string | null)?.trim() || null;
  const video_url = (formData.get("video_url") as string | null)?.trim() || null;
  const title = (formData.get("title") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const image_width_raw = formData.get("image_width");
  const image_height_raw = formData.get("image_height");
  const image_width = image_width_raw ? parseInt(String(image_width_raw), 10) : null;
  const image_height = image_height_raw ? parseInt(String(image_height_raw), 10) : null;

  if (!source_url && !image_url) {
    return { error: "Add either a source URL or an image." };
  }
  if (title && title.length > 200) {
    return { error: "Title is too long (max 200 characters)." };
  }
  if (description && description.length > 2000) {
    return { error: "Description is too long (max 2000 characters)." };
  }

  const size_override_raw = String(formData.get("size_override") ?? "auto");
  let size: PinSize;
  if (size_override_raw === "auto") {
    size = inferSize(image_width, image_height);
  } else if (ALLOWED_SIZES.includes(size_override_raw as PinSize)) {
    size = size_override_raw as PinSize;
  } else {
    size = "medium";
  }

  // ── Resolve category ─────────────────────────────────────────────────────
  const category_id_input = (formData.get("category_id") as string | null)?.trim() || null;
  const category_name_input = (formData.get("category_name") as string | null)?.trim() || null;

  let categoryId: string | null = category_id_input;
  if (!categoryId && category_name_input) {
    const name = category_name_input;
    const { data: existingCat } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      const { data: inserted, error: catErr } = await supabase
        .from("categories")
        .insert({ name, slug: slugify(name) || name.toLowerCase(), created_by: user.id })
        .select("id")
        .single();
      if (catErr) return { error: `Couldn't create category: ${catErr.message}` };
      categoryId = inserted.id;
    }
  }

  // ── Resolve tags ─────────────────────────────────────────────────────────
  const tag_ids = formData.getAll("tag_ids").map(String).filter(Boolean);
  const new_tags = formData.getAll("new_tags").map(String).map((s) => s.trim()).filter(Boolean);

  const resolvedTagIds = new Set<string>(tag_ids);
  if (new_tags.length > 0) {
    const lowercased = new_tags.map((t) => t.toLowerCase());
    const { data: existingTags } = await supabase
      .from("tags")
      .select("id, name")
      .in("name", lowercased);

    const existingByName = new Map<string, string>(
      (existingTags ?? []).map((t) => [t.name.toLowerCase(), t.id]),
    );

    const toInsert: { name: string; slug: string }[] = [];
    for (const name of new_tags) {
      const hit = existingByName.get(name.toLowerCase());
      if (hit) {
        resolvedTagIds.add(hit);
      } else {
        toInsert.push({ name: name.toLowerCase(), slug: slugify(name) || name.toLowerCase() });
      }
    }

    if (toInsert.length > 0) {
      const { data: insertedTags, error: tagErr } = await supabase
        .from("tags")
        .insert(toInsert)
        .select("id");
      if (tagErr) return { error: `Couldn't create tags: ${tagErr.message}` };
      for (const row of insertedTags ?? []) resolvedTagIds.add(row.id);
    }
  }

  // ── Update pin row ───────────────────────────────────────────────────────
  const { error: updErr } = await supabase
    .from("pins")
    .update({
      title,
      description,
      source_url,
      image_url,
      video_url,
      image_width,
      image_height,
      size,
      category_id: categoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pinId);
  if (updErr) return { error: updErr.message };

  // ── Replace tag links: delete-then-insert ────────────────────────────────
  const { error: delTagsErr } = await supabase
    .from("pin_tags")
    .delete()
    .eq("pin_id", pinId);
  if (delTagsErr) return { error: `Couldn't update tags: ${delTagsErr.message}` };

  if (resolvedTagIds.size > 0) {
    const rows = Array.from(resolvedTagIds).map((tag_id) => ({ pin_id: pinId, tag_id }));
    const { error: insTagsErr } = await supabase.from("pin_tags").insert(rows);
    if (insTagsErr) return { error: `Tags failed: ${insTagsErr.message}` };
  }

  revalidatePath("/");
  revalidatePath(`/pin/${pinId}`);
  redirect(`/pin/${pinId}`);
}

// ---------------------------------------------------------------------------
// deletePinAction — bound with the pin id from the edit page
// ---------------------------------------------------------------------------

export async function deletePinAction(pinId: string): Promise<void> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS policy `pins_delete_self` enforces saved_by = auth.uid().
  // pin_tags rows cascade-delete via FK constraint.
  await supabase.from("pins").delete().eq("id", pinId);

  revalidatePath("/");
  redirect("/");
}
