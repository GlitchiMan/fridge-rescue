/**
 * Hand-curated public cooking videos from platforms without an open discovery
 * API (TikTok, Instagram Reels) – or any YouTube video you want to feature.
 *
 * RULES
 * - Only add real, public posts you have opened and checked yourself.
 * - Use the normal share URL (https://www.tiktok.com/@creator/video/123…,
 *   https://www.instagram.com/reel/ABC…/, https://www.youtube.com/watch?v=…).
 * - Copy the creator's handle and the post's own caption/title. Never invent
 *   view counts or other statistics – none are shown for curated items.
 * - Remove an entry if the post is deleted or made private.
 *
 * Example (not active – replace with a real post you have verified):
 * {
 *   url: "https://www.tiktok.com/@creator/video/7300000000000000000",
 *   title: "15-minute garlic noodles",
 *   creator: "@creator",
 *   topic: "easy-pasta",
 *   addedAt: "2026-11-22",
 *   relatedRecipe: "garlic-butter-pasta",
 * },
 */
export interface CuratedVideoEntry {
  url: string;
  title: string;
  creator: string;
  /** One of the topic ids in src/lib/trends/topics.ts. */
  topic: string;
  /** ISO date you verified the post. */
  addedAt: string;
  /** Optional Fridge Rescue recipe slug that matches the dish. */
  relatedRecipe?: string;
}

export const CURATED_VIDEOS: CuratedVideoEntry[] = [];
