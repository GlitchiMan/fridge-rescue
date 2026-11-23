import type { SocialVideo } from "@/lib/videos/model";

/**
 * Trend topics and the pure classification rules (safe on client and server).
 *
 * Definitions used everywhere in the UI:
 *  RECENT   – the video was published in the last 7 days (platform date).
 *  POPULAR  – the platform reports at least POPULAR_MIN_VIEWS views.
 *  TRENDING – a topic whose median views-per-day grew by at least 25% versus a
 *             snapshot taken at least ~20 hours earlier, with enough videos in
 *             both. One recent video is never a trend.
 * Without a qualifying earlier snapshot, the section is "Fresh cooking ideas".
 */
export const TREND_TOPICS = [
  { id: "dinners", label: "Dinners", query: "easy dinner recipe" },
  { id: "quick-breakfast", label: "Quick breakfasts", query: "quick breakfast recipe" },
  { id: "high-protein", label: "High-protein", query: "high protein meal recipe" },
  { id: "budget", label: "Budget", query: "cheap budget meal recipe" },
  { id: "air-fryer", label: "Air fryer", query: "air fryer recipe" },
  { id: "easy-pasta", label: "Easy pasta", query: "easy pasta recipe" },
  { id: "vegetarian", label: "Vegetarian", query: "vegetarian dinner recipe" },
  { id: "student", label: "Student meals", query: "student meals recipe" },
  { id: "desserts", label: "Desserts", query: "easy dessert recipe" },
] as const;
export type TrendTopicId = (typeof TREND_TOPICS)[number]["id"];

export const RECENT_DAYS = 7;
export const POPULAR_MIN_VIEWS = 100_000;
export const TREND_MIN_GROWTH = 0.25;
export const TREND_MIN_VIDEOS = 4;
export const SNAPSHOT_RETENTION_DAYS = 30;

export interface TopicSnapshot {
  id: string;
  label: string;
  query: string;
  videos: SocialVideo[];
  /** Median of (views ÷ days since published) over videos with view data. */
  medianViewsPerDay: number | null;
  measuredVideos: number;
}

export interface TrendSnapshot {
  takenAt: string;
  sources: string[];
  topics: TopicSnapshot[];
}

export interface TopicTrend {
  id: string;
  trending: boolean;
  /** Fractional growth vs the comparison snapshot (0.3 = +30%), when measurable. */
  growth: number | null;
  comparedTo: string | null;
}

export type VideoBadge = "recent" | "popular";

const DAY = 86_400_000;

export function viewsPerDay(v: SocialVideo, now: number): number | null {
  if (v.viewCount === undefined || !v.publishedAt) return null;
  const ageDays = Math.max(1, (now - Date.parse(v.publishedAt)) / DAY);
  return Number.isFinite(ageDays) ? v.viewCount / ageDays : null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function summarizeTopic(topic: { id: string; label: string; query: string }, videos: SocialVideo[], now: number): TopicSnapshot {
  const rates = videos.map((v) => viewsPerDay(v, now)).filter((r): r is number => r !== null);
  return { ...topic, videos, medianViewsPerDay: median(rates), measuredVideos: rates.length };
}

export function videoBadges(v: SocialVideo, now: number): VideoBadge[] {
  const badges: VideoBadge[] = [];
  if (v.publishedAt && now - Date.parse(v.publishedAt) <= RECENT_DAYS * DAY) badges.push("recent");
  if (v.viewCount !== undefined && v.viewCount >= POPULAR_MIN_VIEWS) badges.push("popular");
  return badges;
}

export function classifyTopics(current: TrendSnapshot, previous: TrendSnapshot | null): TopicTrend[] {
  const gapOk = previous && Date.parse(current.takenAt) - Date.parse(previous.takenAt) >= 20 * 3_600_000;
  return current.topics.map((t) => {
    const prev = gapOk ? previous!.topics.find((p) => p.id === t.id) : undefined;
    if (!prev || prev.medianViewsPerDay === null || t.medianViewsPerDay === null || prev.medianViewsPerDay <= 0) {
      return { id: t.id, trending: false, growth: null, comparedTo: null };
    }
    const growth = t.medianViewsPerDay / prev.medianViewsPerDay - 1;
    const enough = t.measuredVideos >= TREND_MIN_VIDEOS && prev.measuredVideos >= TREND_MIN_VIDEOS;
    return { id: t.id, trending: enough && growth >= TREND_MIN_GROWTH, growth, comparedTo: previous!.takenAt };
  });
}

/** What the public API returns to the Discover page. */
export interface TrendsResponse {
  status: "ok" | "disabled" | "no-data" | "error";
  /** "trending" only when at least one topic meets the TRENDING rule. */
  mode: "trending" | "fresh";
  snapshot: TrendSnapshot | null;
  trends: TopicTrend[];
  message?: string;
}
