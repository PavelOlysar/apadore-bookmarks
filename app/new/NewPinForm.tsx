"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import {
  createPinAction,
  fetchOgAction,
  type CreatePinState,
} from "./actions";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Category, Tag, PinSize, PinWithRelations } from "@/lib/types";

type SubmitAction = (
  prev: CreatePinState,
  formData: FormData,
) => Promise<CreatePinState>;

type Props = {
  categories: Category[];
  tags: Tag[];
  // When provided, the form opens in "edit" mode: pre-filled, submits via submitAction.
  initialPin?: PinWithRelations;
  submitAction?: SubmitAction;
  submitLabel?: string;
  cancelHref?: string;
};

type SelectedCategory =
  | { kind: "existing"; id: string; name: string }
  | { kind: "new"; name: string }
  | null;

type SelectedTag =
  | { kind: "existing"; id: string; name: string }
  | { kind: "new"; name: string };

type MediaSource = "og" | "upload";

export function NewPinForm({
  categories,
  tags,
  initialPin,
  submitAction,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction, pending] = useActionState<CreatePinState, FormData>(
    submitAction ?? createPinAction,
    undefined,
  );

  // Form state — pre-filled from initialPin when editing
  const [sourceUrl, setSourceUrl] = useState(initialPin?.source_url ?? "");
  const [imageUrl, setImageUrl] = useState(initialPin?.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(initialPin?.video_url ?? "");
  const [imageWidth, setImageWidth] = useState<number | null>(initialPin?.image_width ?? null);
  const [imageHeight, setImageHeight] = useState<number | null>(initialPin?.image_height ?? null);
  const [title, setTitle] = useState(initialPin?.title ?? "");
  const [description, setDescription] = useState(initialPin?.description ?? "");
  const [category, setCategory] = useState<SelectedCategory>(
    initialPin?.category
      ? { kind: "existing", id: initialPin.category.id, name: initialPin.category.name }
      : null,
  );
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>(
    initialPin?.tags.map((t) => ({ kind: "existing" as const, id: t.id, name: t.name })) ?? [],
  );
  const [size, setSize] = useState<PinSize | "auto">(initialPin?.size ?? "auto");
  const [mediaSource, setMediaSource] = useState<MediaSource>("og");

  // Async UI state
  const [busy, startBusy] = useTransition();
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearMedia() {
    setImageUrl("");
    setVideoUrl("");
    setImageWidth(null);
    setImageHeight(null);
  }

  function handleFetchOg() {
    setMediaError(null);
    startBusy(async () => {
      const res = await fetchOgAction(sourceUrl);
      if (!res) return;
      if (!res.ok) {
        setMediaError(res.error);
        return;
      }
      const og = res.data;
      if (og.title && !title) setTitle(og.title);
      if (og.description && !description) setDescription(og.description);
      if (og.image) {
        setImageUrl(og.image);
        setVideoUrl("");
        try {
          const { w, h } = await measureImage(og.image);
          setImageWidth(w);
          setImageHeight(h);
        } catch { /* dims stay null */ }
      } else {
        setMediaError("This page doesn't expose an image. Try uploading one instead.");
      }
    });
  }

  // Pulls just title + description from the URL — does NOT touch the image.
  // Overwrites any existing values (explicit user action, so they want fresh data).
  const [infoBusy, startInfoBusy] = useTransition();
  const [infoError, setInfoError] = useState<string | null>(null);
  function handleFetchInfo() {
    setInfoError(null);
    if (!sourceUrl.trim()) {
      setInfoError("Paste a URL first.");
      return;
    }
    startInfoBusy(async () => {
      const res = await fetchOgAction(sourceUrl);
      if (!res) return;
      if (!res.ok) {
        setInfoError(res.error);
        return;
      }
      const og = res.data;
      let any = false;
      if (og.title) { setTitle(og.title); any = true; }
      if (og.description) { setDescription(og.description); any = true; }
      if (!any) setInfoError("This page doesn't expose a title or description.");
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    try {
      startBusy(async () => {
        const url = URL.createObjectURL(file);
        const { w, h } = await measureImage(url);
        URL.revokeObjectURL(url);

        const supabase = getSupabaseBrowser();
        const ext = file.name.split(".").pop() || "bin";
        const path = `uploads/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pin-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("pin-images").getPublicUrl(path);
        setImageUrl(pub.publicUrl);
        setVideoUrl("");
        setImageWidth(w);
        setImageHeight(h);
      });
    } catch (err: any) {
      setMediaError(err?.message ?? "Upload failed.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function triggerMediaAction() {
    if (mediaSource === "upload") {
      fileInputRef.current?.click();
      return;
    }
    if (!sourceUrl.trim()) {
      setMediaError("Paste a URL first.");
      return;
    }
    handleFetchOg();
  }

  const canSubmit = (sourceUrl.trim().length > 0 || imageUrl.length > 0) && !pending && !busy;

  return (
    <form
      action={(fd) => {
        fd.set("source_url", sourceUrl);
        fd.set("image_url", imageUrl);
        fd.set("video_url", videoUrl);
        if (imageWidth) fd.set("image_width", String(imageWidth));
        if (imageHeight) fd.set("image_height", String(imageHeight));
        fd.set("title", title);
        fd.set("description", description);
        fd.set("size_override", size);
        if (category?.kind === "existing") fd.set("category_id", category.id);
        if (category?.kind === "new") fd.set("category_name", category.name);
        fd.delete("tag_ids");
        fd.delete("new_tags");
        for (const t of selectedTags) {
          if (t.kind === "existing") fd.append("tag_ids", t.id);
          else fd.append("new_tags", t.name);
        }
        formAction(fd);
      }}
      className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12"
    >
      {/* LEFT — source URL, media source toggle, preview */}
      <div className="space-y-5">
        {/* Source URL */}
        <div>
          <label className="eyebrow block mb-1.5">Source URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            className="input"
          />
          <p className="mt-2 text-xs text-ink-muted">
            Drives the "Fetch from URL" image, and links to the original on the pin's detail page.
          </p>
        </div>

        {/* Media-source toggle */}
        <div>
          <div className="eyebrow mb-2">Media source</div>
          <div className="grid grid-cols-2 gap-2">
            <ToggleOption
              active={mediaSource === "og"}
              onClick={() => setMediaSource("og")}
              label="Fetch from URL"
              hint="Site's hero image"
            />
            <ToggleOption
              active={mediaSource === "upload"}
              onClick={() => setMediaSource("upload")}
              label="Upload"
              hint="Your own file"
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={triggerMediaAction}
            disabled={busy || (mediaSource !== "upload" && !sourceUrl.trim())}
            className="btn-primary"
          >
            {busy
              ? "Working…"
              : mediaSource === "upload"
                ? "Choose file"
                : "Fetch from URL"}
          </button>
          {(imageUrl || videoUrl) && (
            <button type="button" onClick={clearMedia} className="btn-ghost">
              Clear media
            </button>
          )}
        </div>

        {mediaError && <p className="text-sm text-red-700">{mediaError}</p>}

        {/* Preview */}
        <div className="pt-2">
          <div className="eyebrow mb-2">Preview</div>
          <div className="border border-rule bg-[#ece9dc] aspect-[4/5] relative overflow-hidden">
            {busy ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-muted">
                <span className="eyebrow">Loading…</span>
                <span className="text-xs">A few seconds.</span>
              </div>
            ) : videoUrl ? (
              <video
                src={videoUrl}
                poster={imageUrl || undefined}
                muted
                loop
                playsInline
                autoPlay
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-ink-faint">
                <span className="eyebrow">No media yet</span>
              </div>
            )}
          </div>
          {imageUrl && imageWidth && imageHeight && (
            <div className="eyebrow mt-2">
              {imageWidth} × {imageHeight}
              {videoUrl ? " · video + poster" : ""}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — metadata fields */}
      <div className="space-y-7">
        {/* Title with inline Fetch-info action */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="eyebrow">Title</label>
            <button
              type="button"
              onClick={handleFetchInfo}
              disabled={infoBusy || !sourceUrl.trim()}
              className="btn-ghost text-xs"
              title="Pull title + description from the URL"
            >
              {infoBusy ? "Fetching…" : "Fetch info from URL"}
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="input"
          />
          {infoError && <p className="mt-2 text-sm text-red-700">{infoError}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="eyebrow block mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="input"
          />
        </div>

        <CategoryField categories={categories} value={category} onChange={setCategory} />

        <TagsField tags={tags} selected={selectedTags} onChange={setSelectedTags} />

        {/* Size */}
        <div>
          <label className="eyebrow block mb-1.5">Card size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as PinSize | "auto")}
            className="input max-w-xs"
          >
            <option value="auto">Auto (from aspect)</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="wide">Wide (2 cols)</option>
            <option value="tall">Tall (2 rows)</option>
            <option value="large">Large (2 × 2)</option>
          </select>
        </div>

        {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

        <div className="flex items-center gap-5 pt-2">
          <button type="submit" disabled={!canSubmit} className="btn-primary">
            {pending ? "Saving…" : (submitLabel ?? "Save pin")}
          </button>
          <Link href={cancelHref ?? "/"} className="btn-ghost">Cancel</Link>
          {!sourceUrl.trim() && !imageUrl && (
            <span className="text-sm text-ink-muted">Add a URL or media to save.</span>
          )}
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function measureImage(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

function ToggleOption({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border px-3 py-2 transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-paper-card text-ink hover:border-ink"
      }`}
    >
      <div className="text-sm">{label}</div>
      <div className={`mt-0.5 text-[10.5px] tracking-widest uppercase ${active ? "text-paper/70" : "text-ink-muted"}`}>
        {hint}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// CategoryField
// ---------------------------------------------------------------------------

function CategoryField({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: SelectedCategory;
  onChange: (c: SelectedCategory) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories.slice(0, 8);
    return categories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, categories]);

  const exactMatch = categories.find((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div>
      <label className="eyebrow block mb-1.5">Category</label>
      {value && (
        <div className="mb-2 flex items-center gap-3">
          <Chip onRemove={() => onChange(null)}>
            {value.name} {value.kind === "new" && <em className="ml-1 text-ink-muted">(new)</em>}
          </Chip>
        </div>
      )}
      {!value && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search or type to create…"
            className="input"
          />
          {open && (matches.length > 0 || (query.trim() && !exactMatch)) && (
            <div className="absolute z-10 mt-1 w-full bg-paper-card border border-rule shadow-sm">
              {matches.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onMouseDown={(e) => { e.preventDefault(); onChange({ kind: "existing", id: c.id, name: c.name }); setQuery(""); setOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-paper"
                >
                  {c.name}
                </button>
              ))}
              {query.trim() && !exactMatch && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange({ kind: "new", name: query.trim() }); setQuery(""); setOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-paper border-t border-rule"
                >
                  <span className="text-ink-muted">+ Create</span> &ldquo;{query.trim()}&rdquo;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TagsField
// ---------------------------------------------------------------------------

function TagsField({
  tags,
  selected,
  onChange,
}: {
  tags: Tag[];
  selected: SelectedTag[];
  onChange: (s: SelectedTag[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedKey = (t: SelectedTag) =>
    t.kind === "existing" ? `id:${t.id}` : `new:${t.name.toLowerCase()}`;
  const selectedKeys = new Set(selected.map(selectedKey));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = tags.filter((t) => {
      if (selectedKeys.has(`id:${t.id}`)) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return filtered.slice(0, 8);
  }, [query, tags, selectedKeys]);

  const exactMatch = tags.find((t) => t.name.toLowerCase() === query.trim().toLowerCase());
  const alreadyNewSelected = selected.some(
    (s) => s.kind === "new" && s.name.toLowerCase() === query.trim().toLowerCase(),
  );

  function pickExisting(t: Tag) {
    onChange([...selected, { kind: "existing", id: t.id, name: t.name }]);
    setQuery("");
  }
  function createNew(name: string) {
    onChange([...selected, { kind: "new", name }]);
    setQuery("");
  }
  function remove(idx: number) {
    onChange(selected.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="eyebrow block mb-1.5">Tags</label>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((t, i) => (
            <Chip key={selectedKey(t)} onRemove={() => remove(i)}>
              {t.name}
              {t.kind === "new" && <em className="ml-1 text-ink-muted">(new)</em>}
            </Chip>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Add tags…"
          className="input"
        />
        {open && (matches.length > 0 || (query.trim() && !exactMatch && !alreadyNewSelected)) && (
          <div className="absolute z-10 mt-1 w-full bg-paper-card border border-rule shadow-sm">
            {matches.map((t) => (
              <button
                type="button"
                key={t.id}
                onMouseDown={(e) => { e.preventDefault(); pickExisting(t); }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-paper"
              >
                {t.name}
              </button>
            ))}
            {query.trim() && !exactMatch && !alreadyNewSelected && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); createNew(query.trim()); }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-paper border-t border-rule"
              >
                <span className="text-ink-muted">+ Create</span> &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 border border-rule bg-paper-card px-2.5 py-1 text-[13px]">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="text-ink-muted hover:text-ink leading-none"
        aria-label="Remove"
      >
        ×
      </button>
    </span>
  );
}
