export type PinSize = "small" | "medium" | "wide" | "tall" | "large";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type Category = { id: string; name: string; slug: string };
export type Tag = { id: string; name: string; slug: string };

export type Pin = {
  id: string;
  title: string | null;
  description: string | null;
  source_url: string | null;
  image_url: string | null;
  video_url: string | null;
  image_width: number | null;
  image_height: number | null;
  size: PinSize;
  category_id: string | null;
  saved_by: string;
  created_at: string;
};

export type PinWithRelations = Pin & {
  category: Category | null;
  saved_by_profile: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  tags: Tag[];
};
