// Turns a Supabase/GoTrue auth error into a message that's safe to show a user.
//
// Why this exists: when the Supabase project is paused or unreachable, the
// backend returns a Cloudflare 521 HTML page instead of JSON. @supabase/supabase-js
// can't parse it, so the AuthError's `.message` ends up empty or the literal
// string "{}". Surfacing that to the user is useless ("a field turned red and
// said {}"). Here we detect those degenerate messages and replace them with a
// clear, actionable line, while passing through normal messages untouched
// (e.g. "Invalid login credentials", "User already registered").

const UNREACHABLE_MESSAGE =
  "Can't reach the authentication server right now — the database may be paused or restarting. Try again in a moment.";

// A message is "uninformative" if it's empty, just braces/whitespace, or one of
// the generic fetch-failure strings runtimes produce when the host is down.
function isUninformative(message: string): boolean {
  const m = message.trim();
  if (m === "" || m === "{}" || m === "[]" || m === "null" || m === "undefined") {
    return true;
  }
  const lower = m.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("network error") ||
    lower.includes("load failed") ||
    lower.startsWith("<!doctype") ||
    lower.includes("web server is down")
  );
}

export function humanizeAuthError(error: unknown): string {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message ?? "")
      : String(error ?? "");

  return isUninformative(message) ? UNREACHABLE_MESSAGE : message;
}
