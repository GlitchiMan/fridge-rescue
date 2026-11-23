import "server-only";
import { CURATED_VIDEOS } from "@/data/curated-videos";
import { getServerConfig } from "@/lib/server/config";
import { dayKey, getStore } from "@/lib/server/store";
import { parseVideoUrl, type SocialVideo } from "@/lib/videos/model";
import { searchYouTube } from "@/lib/videos/youtube";
import {
  SNAPSHOT_RETENTION_DAYS,
  TREND_TOPICS,
  classifyTopics,
  summarizeTopic,
  type TrendSnapshot,
  type TrendsResponse,
} from "./model";

/**
 * Daily refresh pipeline:
 * query enabled official sources → validate → dedupe → drop unavailable →
 * classify by topic → measure → cache snapshot (≤ 30 days) → serve.
 * Visitors only ever read the cached snapshot; nothing here runs per page view.
 */
const LATEST = "trends:latest";
const DAYS = "trends:days";

function curatedVideos(): Map<string, SocialVideo[]> {
  const byTopic = new Map<string, SocialVideo[]>();
  for (const c of CURATED_VIDEOS) {
    const parsed = parseVideoUrl(c.url);
    if (!parsed) continue; // invalid links are skipped, never "fixed up"
    const list = byTopic.get(c.topic) ?? [];
    list.push({
      platform: parsed.platform,
      id: parsed.id,
      url: parsed.url,
      title: c.title.slice(0, 200),
      creator: c.creator.slice(0, 100),
      publishedAt: undefined,
      embeddable: false,
      source: "curated",
      fetchedAt: `${c.addedAt}T00:00:00.000Z`,
    });
    byTopic.set(c.topic, list);
  }
  return byTopic;
}

export async function refreshTrends(): Promise<{ ok: boolean; message: string; snapshot?: TrendSnapshot }> {
  const config = getServerConfig();
  const curated = curatedVideos();
  if (!config.youtube.enabled && curated.size === 0) {
    return { ok: false, message: "No content source is enabled (set YOUTUBE_ENABLED + YOUTUBE_API_KEY, or add curated videos)." };
  }

  const now = Date.now();
  const publishedAfter = new Date(now - 14 * 86_400_000).toISOString();
  const seen = new Set<string>();
  const topics = [];
  for (const topic of TREND_TOPICS) {
    const found: SocialVideo[] = [];
    if (config.youtube.enabled) {
      const res = await searchYouTube(topic.query, { order: "viewCount", publishedAfter, maxResults: 10, cacheSeconds: 60 * 60 * 20 });
      if (res.status === "quota-exceeded") return { ok: false, message: "YouTube quota reached – keeping the previous snapshot." };
      found.push(...res.videos);
    }
    found.push(...(curated.get(topic.id) ?? []));
    const unique = found.filter((v) => {
      const k = `${v.platform}:${v.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    topics.push(summarizeTopic(topic, unique, now));
  }

  const snapshot: TrendSnapshot = {
    takenAt: new Date(now).toISOString(),
    sources: [config.youtube.enabled ? "YouTube Data API" : null, curated.size ? "Curated links" : null].filter((s): s is string => Boolean(s)),
    topics,
  };
  const store = getStore();
  const today = dayKey();
  const ttl = SNAPSHOT_RETENTION_DAYS * 86_400;
  await store.set(`trends:snap:${today}`, snapshot, ttl);
  await store.set(LATEST, snapshot, ttl);
  const days = ((await store.get<string[]>(DAYS)) ?? []).filter((d) => d !== today);
  await store.set(DAYS, [today, ...days].slice(0, SNAPSHOT_RETENTION_DAYS), ttl);
  return { ok: true, message: `Refreshed ${topics.length} topics from ${snapshot.sources.join(" + ")}.`, snapshot };
}

export async function readTrends(): Promise<TrendsResponse> {
  const config = getServerConfig();
  const store = getStore();
  const latest = await store.get<TrendSnapshot>(LATEST);
  if (!latest) {
    return {
      status: config.youtube.enabled || CURATED_VIDEOS.length ? "no-data" : "disabled",
      mode: "fresh",
      snapshot: null,
      trends: [],
      message: config.youtube.enabled ? "No snapshot yet – run the refresh once." : "Live video discovery isn't connected yet.",
    };
  }
  const days = (await store.get<string[]>(DAYS)) ?? [];
  const latestDay = latest.takenAt.slice(0, 10);
  let previous: TrendSnapshot | null = null;
  for (const d of days) {
    if (d >= latestDay) continue;
    previous = await store.get<TrendSnapshot>(`trends:snap:${d}`);
    if (previous) break;
  }
  const trends = classifyTopics(latest, previous);
  return { status: "ok", mode: trends.some((t) => t.trending) ? "trending" : "fresh", snapshot: latest, trends };
}
