"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { fetchOg, type OgResult } from "@/lib/og";
import { inferSize } from "@/lib/size";
import type { PinSize } from "@/lib/types";

// ---------------------------------------------------------------------------
// fetchOgAction — called from the form's "Fetch from URL" button
// ---------------------------------------------------------------------------

export type FetchOgState =
  | { ok: true; data: OgResult }
  | { ok: false; error: string }
  | undefined;

export async function fetchOgAction(url: string): Promise<FetchOgState> {
  if (!url.trim()) return { ok: false, error: "Paste a URL first." };
  const result = await fetchOg(url.trim());
  if (!result) {
    return { ok: false, error: "Couldn't read that URL. You can still fill the form manually." };
  }
  return { ok: true, data: result };
}

// (Removed in v1.6: captureUrlAction + Playwright-based scroll-video/screenshot
// modes — incompatible with the Cloudflare Workers runtime. Pins now use
// "Fetch from URL" (OG image) or "Upload" only. Existing pins with stored
// video_url values continue to play on hover and on the detail page.)

// ---------------------------------------------------------------------------
// createPinAction — saves the form
// ---------------------------------------------------------------------------

export type CreatePinState = { error?: string } | undefined;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const ALLOWED_SIZES: PinSize[] = ["small", "medium", "wide", "tall", "large"];

export async function createPinAction(
  _prev: CreatePinState,
  formData: FormData,
): Promise<CreatePinState> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  // Parse inputs
  const source_url = (formData.get("source_url") as string | null)?.trim() || null;
  const image_url = (formData.get("image_url") as string | null)?.trim() || null;
  const video_url = (formData.get("video_url") as string | null)?.trim() || null;
  const title = (formData.get("title") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const image_width_raw = formData.get("image_width");
  const image_height_raw = formData.get("image_height");
  const image_width = image_width_raw ? parseInt(String(image_width_raw), 10) : null;
  const image_height = image_height_raw ? parseInt(String(image_height_raw), 10) : null;

  const size_override_raw = String(formData.get("size_override") ?? "auto");
  let size: PinSize;
  if (size_override_raw === "auto") {
    size = inferSize(image_width, image_height);
  } else if (ALLOWED_SIZES.includes(size_override_raw as PinSize)) {
    size = size_override_raw as PinSize;
  } else {
    size = "medium";
  }

  const category_id_input = (formData.get("category_id") as string | null)?.trim() || null;
  const category_name_input = (formData.get("category_name") as string | null)?.trim() || null;

  // Tags arrive as repeated form fields: tag_ids[] and new_tags[]
  const tag_ids = formData.getAll("tag_ids").map(String).filter(Boolean);
  const new_tags = formData.getAll("new_tags").map(String).map((s) => s.trim()).filter(Boolean);

  // Validate
  if (!source_url && !image_url) {
    return { error: "Add either a source URL or an image." };
  }
  if (title && title.length > 200) {
    return { error: "Title is too long (max 200 characters)." };
  }
  if (description && description.length > 2000) {
    return { error: "Description is too long (max 2000 characters)." };
  }

  // ── Resolve category ─────────────────────────────────────────────────────
  let categoryId: string | null = category_id_input;
  if (!categoryId && category_name_input) {
    const name = category_name_input;
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      categoryId = existing.id;
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

  // ── Insert pin ───────────────────────────────────────────────────────────
  const { data: pin, error: pinErr } = await supabase
    .from("pins")
    .insert({
      title,
      description,
      source_url,
      image_url,
      video_url,
      image_width,
      image_height,
      size,
      category_id: categoryId,
      saved_by: user.id,
    })
    .select("id")
    .single();

  if (pinErr) return { error: pinErr.message };

  // ── Attach tags ──────────────────────────────────────────────────────────
  if (resolvedTagIds.size > 0) {
    const rows = Array.from(resolvedTagIds).map((tag_id) => ({ pin_id: pin.id, tag_id }));
    const { error: linkErr } = await supabase.from("pin_tags").insert(rows);
    if (linkErr) {
      return { error: `Pin saved but tags failed: ${linkErr.message}` };
    }
  }

  revalidatePath("/");
  redirect("/");
}
