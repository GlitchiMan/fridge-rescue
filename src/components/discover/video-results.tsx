"use client";

import { ExternalLink, VideoOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/empty-state";
import { youTubeSearchUrl, type VideoSearchResult } from "@/lib/videos/model";
import { VideoCard } from "./video-card";

/**
 * Fetches real videos from /api/videos for one search and renders them.
 * When live search isn't connected (or quota is used up), it says so and
 * offers a real YouTube search link instead – never placeholder videos.
 */
export function VideoResults({ params, fallbackQuery, limit = 6, columns = "sm:grid-cols-2 lg:grid-cols-3" }: { params: string | null; fallbackQuery: string; limit?: number; columns?: string }) {
  const [state, setState] = useState<{ key: string; result: VideoSearchResult } | null>(null);
  const loading = params !== null && state?.key !== params;

  useEffect(() => {
    if (!params) return;
    let alive = true;
    fetch(`/api/videos?${params}`)
      .then((r) => r.json() as Promise<VideoSearchResult>)
      .then((result) => alive && setState({ key: params, result }))
      .catch(() => alive && setState({ key: params, result: { status: "error", videos: [], message: "Video search is unavailable right now." } }));
    return () => {
      alive = false;
    };
  }, [params]);

  if (!params) return null;
  if (loading) {
    return (
      <ul className={`grid gap-4 ${columns}`} aria-busy="true" aria-label="Loading videos">
        {Array.from({ length: Math.min(limit, 3) }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-video" />
            <Skeleton className="mt-3 h-4 w-3/4" />
          </li>
        ))}
      </ul>
    );
  }
  const result = state?.result;
  if (result?.status === "ok" && result.videos.length) {
    return (
      <div>
        <ul className={`grid gap-4 ${columns}`}>
          {result.videos.slice(0, limit).map((v, i) => (
            <li key={`${v.platform}:${v.id}`} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <VideoCard video={v} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Videos from YouTube{result.fetchedAt ? ` · fetched ${new Date(result.fetchedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}. Creators&apos; recipes aren&apos;t checked by Fridge Rescue.
        </p>
      </div>
    );
  }

  const query = result?.query || fallbackQuery;
  return (
    <div className="flex flex-col gap-4 rounded-[0.875rem] border border-dashed border-line-strong p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <VideoOff className="mt-0.5 size-5 shrink-0 text-faint" aria-hidden strokeWidth={1.5} />
        <div>
          <p className="font-medium">
            {result?.status === "disabled"
              ? "Video search isn't connected yet."
              : result?.status === "quota-exceeded"
                ? "Today's video searches are used up."
                : result?.status === "empty"
                  ? "No matching videos found."
                  : result?.status === "rate-limited"
                    ? "Too many searches – try again in a minute."
                    : "Video search is unavailable right now."}
          </p>
          <p className="mt-0.5 text-sm text-muted">You can still search YouTube directly.</p>
          {result?.status === "disabled" && <p className="mt-1 text-xs text-faint">Site owner: add a YouTube Data API key – see docs/DISCOVER.md.</p>}
        </div>
      </div>
      <a href={youTubeSearchUrl(query)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 self-start rounded-[0.625rem] border border-line-strong bg-paper px-3.5 text-sm font-medium hover:border-ink/40 sm:self-auto">
        Search YouTube <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}
