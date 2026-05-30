export type OgResult = {
  title?: string;
  description?: string;
  image?: string;
};

// Fetch OpenGraph metadata for a URL.
//
// Implemented with native `fetch` + a tiny regex parser — NO cheerio. cheerio
// 1.x pulls in `undici`, which fails to load on the Cloudflare Workers runtime
// (even with nodejs_compat) and took down the entire `app/new/actions.ts`
// module, breaking both "Fetch from URL" and "Save pin". This implementation
// is dependency-free and behaves identically in Node (local dev) and Workers.
//
// Returns null on any failure.
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

    // Index every <meta> tag by its property/name/itemprop key → content.
    // First occurrence wins (pages sometimes repeat tags).
    const metaByKey = new Map<string, string>();
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const key = (
        attr(tag, "property") ||
        attr(tag, "name") ||
        attr(tag, "itemprop")
      )?.toLowerCase();
      const content = attr(tag, "content");
      if (key && content && !metaByKey.has(key)) metaByKey.set(key, content);
    }
    const meta = (key: string) => metaByKey.get(key) || undefined;

    const title =
      meta("og:title") ||
      meta("twitter:title") ||
      titleTag(html);

    let description: string | undefined =
      meta("og:description") ||
      meta("twitter:description") ||
      meta("article:description") ||
      meta("description");

    // Last-resort fallback: first reasonably-long paragraph from the body.
    if (!description) {
      for (const para of html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) ?? []) {
        const text = stripTags(para);
        if (text.length >= 30) {
          description = text.length > 280 ? text.slice(0, 277) + "…" : text;
          break;
        }
      }
    }

    let image =
      meta("og:image") ||
      meta("og:image:secure_url") ||
      meta("twitter:image") ||
      meta("twitter:image:src");

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

// ---------------------------------------------------------------------------
// Tiny HTML helpers — no dependencies, runtime-agnostic.
// ---------------------------------------------------------------------------

// Reads an attribute value from a single tag string, tolerant of single/double
// quotes and attribute order. Returns a decoded, trimmed value or undefined.
function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  const raw = m ? (m[1] ?? m[2]) : undefined;
  if (!raw) return undefined;
  const v = decodeEntities(raw).trim();
  return v || undefined;
}

function titleTag(html: string): string | undefined {
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const v = m ? decodeEntities(m[1]).trim() : undefined;
  return v || undefined;
}

function stripTags(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

// Decode the handful of HTML entities that actually show up in meta content.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)));
}

function safeCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}
