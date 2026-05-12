import type { PinSize } from "./types";

// Map an image's aspect ratio (width / height) to a grid-span hint.
export function inferSize(width: number | null | undefined, height: number | null | undefined): PinSize {
  if (!width || !height) return "medium";
  const a = width / height;
  if (a > 1.6) return "wide";
  if (a < 0.65) return "tall";
  return "medium";
}

// Tailwind-compatible class strings for each size.
export const sizeClasses: Record<PinSize, string> = {
  small:  "col-span-1 row-span-1",
  medium: "col-span-1 row-span-1",
  wide:   "col-span-1 sm:col-span-2 row-span-1",
  tall:   "col-span-1 row-span-2",
  large:  "col-span-1 sm:col-span-2 row-span-2",
};

// Approximate aspect ratio used when the image hasn't loaded yet, so the grid
// reserves the right cell shape and avoids layout shift.
export const aspectFor: Record<PinSize, string> = {
  small:  "aspect-[4/5]",
  medium: "aspect-[4/5]",
  wide:   "aspect-[16/9]",
  tall:   "aspect-[3/5]",
  large:  "aspect-square",
};
