import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

// Initialize the @opennextjs/cloudflare dev-time wrapper so `next dev` can
// access Cloudflare bindings (env vars, etc.) the same way they're exposed in
// production. Safe no-op outside of dev.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

export default config;
