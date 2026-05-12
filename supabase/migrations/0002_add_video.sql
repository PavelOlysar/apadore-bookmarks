-- v1.4: add video media support to pins
alter table public.pins
  add column if not exists video_url text;

-- The pin-images bucket already exists from migration 0001. It allows arbitrary
-- file types since storage.objects has no MIME filter. So we reuse it for
-- both image and video uploads — no second bucket needed.

-- Rename clarification (optional, kept for forward-compat docs): treat the
-- `pin-images` bucket as `pin-media`. We don't actually rename the bucket
-- since the old `image_url`s already point to URLs containing `/pin-images/`.
