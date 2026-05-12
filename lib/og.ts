import * as cheerio from "cheerio";

export type OgResult = {
  title?: string;
  description?: string;
  image?: string;
};

// Fetch OpenGraph metadata for a URL. Native fetch + cheerio so it runs on
// Cloudflare Workers (no Node-http dependency). Returns null on any failure.
export async function fetchOg(url: string): Promise<OgResult | null> {
  try {
    new URL(url);
  } catch {
    return null;
  }

  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ApadoreBookmarks/1.0)" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const meta = (selector: string, attr: string = "content"): string | undefined => {
      const v = $(selector).first().attr(attr);
      return v && v.trim() ? v.trim() : undefined;
    };

    const title =
      meta('meta[property="og:title"]') ||
      meta('meta[name="twitter:title"]') ||
      ($("title").first().text().trim() || undefined);

    const description =
      meta('meta[property="og:description"]') ||
      meta('meta[name="twitter:description"]') ||
      meta('meta[name="description"]');

    let image =
      meta('meta[property="og:image"]') ||
      meta('meta[property="og:image:secure_url"]') ||
      meta('meta[name="twitter:image"]') ||
      meta('meta[name="twitter:image:src"]');

    // Resolve relative image URLs against the page URL.
    if (image) {
      try {
        image = new URL(image, url).toString();
      } catch {
        // leave as-is if it doesn't parse
      }
    }

    return { title, description, image };
  } catch {
    return null;
  }
}
