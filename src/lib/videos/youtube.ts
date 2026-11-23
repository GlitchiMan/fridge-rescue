import "server-only";
import { getServerConfig } from "@/lib/server/config";
import { getStore, pacificDayKey } from "@/lib/server/store";
import { decodeEntities, isYouTubeId, parseIsoDuration, sanitizeQuery, type SocialVideo, type VideoSearchResult } from "./model";

/**
 * YouTube Data API v3 provider (official API, server-side only).
 *
 * Quota (Google defaults): 10,000 units/day per project, resetting at midnight
 * Pacific Time. search.list = 100 units, videos.list = 1 unit. We cap usage
 * below the default (YOUTUBE_DAILY_QUOTA_UNITS) and cache every result.
 * Retention: API metadata is cached for at most 7 days here and refreshed –
 * well inside the YouTube API Services Developer Policies' refresh rules.
 */
const API = "https://www.googleapis.com/youtube/v3";
const SEARCH_COST = 100;
const VIDEOS_COST = 1;

async function spendQuota(units: number): Promise<boolean> {
  const { youtube } = getServerConfig();
  const store = getStore();
  const key = `yt-quota:${pacificDayKey()}`;
  const used = (await store.get<number>(key)) ?? 0;
  if (used + units > youtube.dailyQuotaUnits) return false;
  await store.set(key, used + units, 60 * 60 * 30);
  return true;
}

export async function youTubeQuotaUsed(): Promise<number> {
  return (await getStore().get<number>(`yt-quota:${pacificDayKey()}`)) ?? 0;
}

interface SearchItem {
  id?: { videoId?: string };
}
interface VideoItem {
  id: string;
  snippet?: { title?: string; channelTitle?: string; channelId?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }>; liveBroadcastContent?: string };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string };
  status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string };
}

export interface YouTubeSearchOptions {
  maxResults?: number;
  order?: "relevance" | "viewCount" | "date";
  publishedAfter?: string;
  /** Cache lifetime for this query. */
  cacheSeconds?: number;
}

/** Search cooking videos. Results are cached; quota is checked before every call. */
export async function searchYouTube(rawQuery: string, opts: YouTubeSearchOptions = {}): Promise<VideoSearchResult> {
  const config = getServerConfig().youtube;
  const query = sanitizeQuery(rawQuery);
  if (!config.enabled) return { status: "disabled", videos: [], query, message: "YouTube discovery isn't configured." };
  if (!query) return { status: "empty", videos: [], query };

  const store = getStore();
  const max = Math.min(Math.max(opts.maxResults ?? 8, 1), 15);
  const cacheKey = `yt-search:${opts.order ?? "relevance"}:${opts.publishedAfter?.slice(0, 10) ?? "any"}:${max}:${query.toLowerCase()}`;
  const cached = await store.get<VideoSearchResult>(cacheKey);
  if (cached) return cached;

  if (!(await spendQuota(SEARCH_COST + VIDEOS_COST))) {
    return { status: "quota-exceeded", videos: [], query, message: "Today's video search quota is used up. Cached results still work." };
  }

  try {
    const search = new URL(`${API}/search`);
    search.search = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: query,
      maxResults: String(max + 4), // headroom for filtering
      order: opts.order ?? "relevance",
      safeSearch: "strict",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      relevanceLanguage: "en",
      regionCode: config.regionCode,
      ...(opts.publishedAfter ? { publishedAfter: opts.publishedAfter } : {}),
      key: config.apiKey,
    }).toString();
    const sRes = await fetch(search, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!sRes.ok) throw new Error(`search ${sRes.status}`);
    const ids = ((await sRes.json()) as { items?: SearchItem[] }).items
      ?.map((i) => i.id?.videoId)
      .filter((id): id is string => Boolean(id && isYouTubeId(id)));
    const unique = Array.from(new Set(ids ?? []));
    if (!unique.length) {
      const empty: VideoSearchResult = { status: "empty", videos: [], query, fetchedAt: new Date().toISOString() };
      await store.set(cacheKey, empty, 60 * 60 * 6);
      return empty;
    }

    // Second call: real duration, statistics and availability for each video.
    const details = new URL(`${API}/videos`);
    details.search = new URLSearchParams({ part: "snippet,contentDetails,statistics,status", id: unique.join(","), key: config.apiKey }).toString();
    const dRes = await fetch(details, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!dRes.ok) throw new Error(`videos ${dRes.status}`);
    const items = ((await dRes.json()) as { items?: VideoItem[] }).items ?? [];
    const fetchedAt = new Date().toISOString();

    const videos: SocialVideo[] = items
      .filter((v) => v.status?.privacyStatus === "public" && v.status?.embeddable !== false && v.snippet?.liveBroadcastContent !== "live" && v.snippet?.liveBroadcastContent !== "upcoming")
      .map((v) => {
        const thumbs = v.snippet?.thumbnails ?? {};
        const duration = parseIsoDuration(v.contentDetails?.duration);
        return {
          platform: "youtube" as const,
          id: v.id,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          title: decodeEntities(v.snippet?.title ?? "").slice(0, 200),
          creator: decodeEntities(v.snippet?.channelTitle ?? "").slice(0, 100),
          creatorUrl: v.snippet?.channelId ? `https://www.youtube.com/channel/${encodeURIComponent(v.snippet.channelId)}` : undefined,
          thumbnailUrl: (thumbs.high ?? thumbs.medium ?? thumbs.default)?.url,
          publishedAt: v.snippet?.publishedAt,
          durationSeconds: duration,
          viewCount: v.statistics?.viewCount !== undefined ? Number(v.statistics.viewCount) : undefined,
          likeCount: v.statistics?.likeCount !== undefined ? Number(v.statistics.likeCount) : undefined,
          embeddable: v.status?.embeddable !== false,
          source: "youtube-data-api" as const,
          fetchedAt,
        };
      })
      // Cooking demonstrations, not 3-hour livestream archives or 10-second clips.
      .filter((v) => v.title && (v.durationSeconds === undefined || (v.durationSeconds >= 20 && v.durationSeconds <= 60 * 45)))
      .slice(0, max);

    const result: VideoSearchResult = { status: videos.length ? "ok" : "empty", videos, query, fetchedAt };
    await store.set(cacheKey, result, opts.cacheSeconds ?? 60 * 60 * 24 * 3);
    return result;
  } catch (e) {
    console.error("[youtube]", e instanceof Error ? e.message : e);
    return { status: "error", videos: [], query, message: "Video search is temporarily unavailable." };
  }
}
