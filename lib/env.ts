// Reads a server-side env var, working both locally (process.env) and on
// Cloudflare Workers via @opennextjs/cloudflare's request-scoped bindings.
//
// On Cloudflare, dashboard-set variables aren't always reflected in
// process.env — they're properly exposed through `getCloudflareContext().env`.
// We try that first, then fall back to process.env for local dev / build time.
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function serverEnv(name: string): string | undefined {
  try {
    const cfEnv = getCloudflareContext().env as unknown as Record<string, string | undefined>;
    const v = cfEnv?.[name];
    if (v) return v;
  } catch {
    // Not in a Cloudflare request context (local dev, build, etc.) — fine.
  }
  return process.env[name];
}
