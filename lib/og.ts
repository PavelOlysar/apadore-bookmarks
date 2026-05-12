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

    let description: string | undefined =
      meta('meta[property="og:description"]') ||
      meta('meta[name="twitter:description"]') ||
      meta('meta[property="article:description"]') ||
      meta('meta[itemprop="description"]') ||
      meta('meta[name="description"]');

    // Last-resort fallback: pull the first non-empty paragraph from the body.
    // Useful for sites that don't expose any description meta tag.
    if (!description) {
      const candidates = [
        $("article p").first(),
        $("main p").first(),
        $("body p").first(),
      ];
      for (const $p of candidates) {
        const text = $p.text().trim().replace(/\s+/g, " ");
        if (text.length >= 30) {
          description = text.length > 280 ? text.slice(0, 277) + "…" : text;
          break;
        }
      }
    }

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
