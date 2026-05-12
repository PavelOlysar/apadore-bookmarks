export function formatPinDate(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}
