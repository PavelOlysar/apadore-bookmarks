import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config — no R2 cache, no D1 tag cache, just the basic Workers adapter.
// We can layer those on later when traffic justifies them.
export default defineCloudflareConfig({});
