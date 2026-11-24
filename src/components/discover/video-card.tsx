"use client";

import { Bookmark, ChefHat, ExternalLink, Play, Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setInspiration } from "@/lib/generate/client";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { discoverSettings, useDiscoverSettings } from "@/lib/discover/settings";
import { videoBadges } from "@/lib/trends/model";
import { cn } from "@/lib/utils/cn";
import { PLATFORM_LABEL, formatCount, formatDuration, youTubeEmbedUrl, type SocialVideo } from "@/lib/videos/model";
import { VideoMatchPanel } from "./video-match-panel";

function relativeDate(iso?: string): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days)) return null;
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Compact preview card – the actual player loads only when the user chooses to watch. */
export function VideoCard({ video, compact = false, now }: { video: SocialVideo; compact?: boolean; now?: number }) {
  const [watching, setWatching] = useState(false);
  const [matching, setMatching] = useState(false);
  const settings = useDiscoverSettings();
  const toast = useToast();
  const router = useRouter();
  const saved = settings.savedIdeas.some((s) => s.platform === video.platform && s.id === video.id);
  const badges = now ? videoBadges(video, now) : [];
  const duration = formatDuration(video.durationSeconds);
  const views = formatCount(video.viewCount);
  const embed = video.platform === "youtube" && video.embeddable ? youTubeEmbedUrl(video.id) : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[0.875rem] border border-line bg-paper transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_14px_32px_-18px_rgb(22_26_23_/_0.35)] motion-reduce:hover:translate-y-0">
      <button
        type="button"
        onClick={() => (embed ? setWatching(true) : window.open(video.url, "_blank", "noopener,noreferrer"))}
        className="relative block aspect-video w-full overflow-hidden bg-ink/[0.06] text-left"
        aria-label={`Watch “${video.title}” on ${PLATFORM_LABEL[video.platform]}`}
      >
        {video.thumbnailUrl ? (
          <Image src={video.thumbnailUrl} alt="" fill sizes={compact ? "240px" : "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted">{PLATFORM_LABEL[video.platform]}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/15">
          <span className="flex size-11 items-center justify-center rounded-full bg-paper/95 text-ink shadow-lift transition-transform group-hover:scale-105">
            <Play className="ml-0.5 size-5 fill-current" aria-hidden />
          </span>
        </span>
        {duration && <span className="absolute bottom-2 right-2 rounded-[0.25rem] bg-ink/80 px-1.5 py-0.5 text-[0.6875rem] font-medium tabular-nums text-white">{duration}</span>}
        <span className="absolute left-2 top-2 rounded-[0.25rem] bg-paper/95 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ink">{PLATFORM_LABEL[video.platform]}</span>
      </button>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className={cn("font-sans font-medium leading-snug tracking-normal text-ink", compact ? "line-clamp-2 text-[0.8125rem]" : "line-clamp-2 text-[0.9375rem]")}>{video.title}</h3>
        <p className="mt-1 truncate text-xs text-muted">
          {video.creatorUrl ? (
            <a href={video.creatorUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">{video.creator}</a>
          ) : (
            video.creator
          )}
          {relativeDate(video.publishedAt) && ` · ${relativeDate(video.publishedAt)}`}
          {views && ` · ${views} views`}
        </p>
        {badges.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {badges.includes("recent") && <span className="tag bg-forest-50 text-accent">Recent</span>}
            {badges.includes("popular") && <span className="tag bg-orange-soft text-orange-ink">Popular</span>}
          </div>
        )}
        {!compact && (
          <div className="mt-auto flex flex-wrap gap-1 pt-3">
            <button
              type="button"
              onClick={() => {
                const now = discoverSettings.toggleSaved(video);
                toast.show(now ? "Saved to your ideas" : "Removed from your ideas");
              }}
              aria-pressed={saved}
              className={cn("inline-flex min-h-8 items-center gap-1 rounded-[0.5rem] px-2 text-xs font-medium transition-colors", saved ? "bg-forest-50 text-accent" : "text-ink-soft hover:bg-ink/[0.05]")}
            >
              <Bookmark className={cn("size-3.5", saved && "fill-current")} aria-hidden /> {saved ? "Saved" : "Save idea"}
            </button>
            <button type="button" onClick={() => setMatching(true)} className="inline-flex min-h-8 items-center gap-1 rounded-[0.5rem] px-2 text-xs font-medium text-ink-soft hover:bg-ink/[0.05]">
              <Search className="size-3.5" aria-hidden /> Can I make this?
            </button>
            <button
              type="button"
              onClick={() => {
                // Fridge AI makes its own version from the dish idea – it never sees the video itself.
                setInspiration({ title: video.title.slice(0, 200), creator: video.creator.slice(0, 100), platform: video.platform, url: video.url });
                router.push("/#cook");
              }}
              className="inline-flex min-h-8 items-center gap-1 rounded-[0.5rem] px-2 text-xs font-medium text-ink-soft hover:bg-ink/[0.05]"
            >
              <ChefHat className="size-3.5" aria-hidden /> Make something like this
            </button>
          </div>
        )}
      </div>

      <Dialog open={watching} onClose={() => setWatching(false)} title={video.title} description={`${video.creator} · ${PLATFORM_LABEL[video.platform]}`} size="lg">
        {watching && embed && (
          <div className="relative aspect-video overflow-hidden rounded-[0.625rem] bg-charcoal">
            <iframe
              src={embed}
              title={video.title}
              className="absolute inset-0 size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          Played by YouTube in privacy-enhanced mode. {" "}
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
            Open on YouTube <ExternalLink className="size-3" aria-hidden />
          </a>
        </p>
      </Dialog>

      <Dialog open={matching} onClose={() => setMatching(false)} title="Can I make this?" description={`“${video.title}”`} size="lg">
        {matching && <VideoMatchPanel video={video} onClose={() => setMatching(false)} />}
      </Dialog>
    </article>
  );
}
