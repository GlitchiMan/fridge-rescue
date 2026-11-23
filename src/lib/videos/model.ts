/**
 * Platform-neutral video model + pure helpers (safe on server and client).
 * Videos only ever come from an official API response or a hand-curated,
 * verified link – never invented.
 */

export const VIDEO_PLATFORMS = ["youtube", "tiktok", "instagram"] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

export const PLATFORM_LABEL: Record<VideoPlatform, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };

export interface SocialVideo {
  platform: VideoPlatform;
  /** Platform video id (validated). */
  id: string;
  /** Canonical watch URL on the platform. */
  url: string;
  title: string;
  creator: string;
  creatorUrl?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  durationSeconds?: number;
  /** Only present when the platform API returned it. Never estimated. */
  viewCount?: number;
  likeCount?: number;
  embeddable: boolean;
  /** Where this record came from. */
  source: "youtube-data-api" | "curated";
  /** When the metadata was fetched from the platform (ISO). */
  fetchedAt: string;
}

export interface VideoSearchResult {
  status: "ok" | "disabled" | "quota-exceeded" | "rate-limited" | "error" | "empty";
  videos: SocialVideo[];
  query?: string;
  fetchedAt?: string;
  message?: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
export const isYouTubeId = (id: string) => YT_ID.test(id);

/** "PT1H2M10S" → 3730. Returns undefined for anything unexpected. */
export function parseIsoDuration(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return undefined;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

export function formatDuration(sec?: number): string | null {
  if (sec === undefined) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatCount(n?: number): string | null {
  if (n === undefined) return null;
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Decode the few HTML entities YouTube's API puts in titles. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Keep search terms short, plain and food-focused. */
export function sanitizeQuery(q: string): string {
  return q
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s&'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function buildRecipeVideoQuery(recipe: { title: string; totalMinutes: number }): string {
  const title = recipe.title.replace(/\b(easy|simple|classic|quick|homemade|one-bowl|everyday|leftover|golden)\b/gi, "").trim();
  return sanitizeQuery(`${recipe.totalMinutes <= 20 ? "quick " : ""}${title} recipe`);
}

export function buildIngredientVideoQuery(names: string[], opts: { maxMinutes?: number | null; vegetarian?: boolean } = {}): string {
  const parts = names.slice(0, 3).map((n) => n.replace(/ \(.*\)/, "").toLowerCase());
  const prefix = opts.maxMinutes && opts.maxMinutes <= 30 ? `${opts.maxMinutes} minute ` : "easy ";
  return sanitizeQuery(`${prefix}${opts.vegetarian ? "vegetarian " : ""}${parts.join(" ")} recipe`);
}

/**
 * Parse a hand-curated public link into a platform + id.
 * Only the official URL shapes are accepted; anything else is rejected.
 */
export function parseVideoUrl(raw: string): { platform: VideoPlatform; id: string; url: string } | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtube.com") {
    const v = u.searchParams.get("v") ?? u.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    return v && isYouTubeId(v) ? { platform: "youtube", id: v, url: `https://www.youtube.com/watch?v=${v}` } : null;
  }
  if (host === "youtu.be") {
    const v = u.pathname.slice(1);
    return isYouTubeId(v) ? { platform: "youtube", id: v, url: `https://www.youtube.com/watch?v=${v}` } : null;
  }
  if (host === "tiktok.com") {
    const m = u.pathname.match(/^\/@([\w.-]{2,24})\/video\/(\d{8,25})\/?$/);
    return m ? { platform: "tiktok", id: m[2]!, url: `https://www.tiktok.com/@${m[1]}/video/${m[2]}` } : null;
  }
  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(?:reel|p)\/([A-Za-z0-9_-]{5,40})\/?$/);
    return m ? { platform: "instagram", id: m[1]!, url: `https://www.instagram.com/reel/${m[1]}/` } : null;
  }
  return null;
}

/** Privacy-enhanced YouTube embed, loaded only after the user chooses to watch. */
export function youTubeEmbedUrl(id: string): string | null {
  return isYouTubeId(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` : null;
}

/** A real search link on the platform – used when live discovery isn't connected. */
export function youTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(sanitizeQuery(query))}`;
}
