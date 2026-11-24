"use client";

import { ChefHat, ExternalLink, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { setInspiration } from "@/lib/generate/client";
import type { TrendsResponse } from "@/lib/trends/model";
import { cn } from "@/lib/utils/cn";
import { PLATFORM_LABEL, youTubeEmbedUrl, type SocialVideo } from "@/lib/videos/model";

export interface KitchenPhoto {
  slug: string;
  title: string;
  totalMinutes: number;
  image: string;
}

function when(iso?: string): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Scroll-snap row that stays inside the page on phones. */
const ROW = "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 xl:-mx-12 xl:scroll-px-12 xl:px-12 [&::-webkit-scrollbar]:hidden";

/**
 * "Fresh food inspiration": real videos from the cached daily snapshot (official
 * YouTube API + hand-verified links). Never invented. Until a video source is
 * connected it shows the app's own recipe photography instead.
 */
export function InspirationRail({ kitchen }: { kitchen: KitchenPhoto[] }) {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [topic, setTopic] = useState<string>("all");

  useEffect(() => {
    let alive = true;
    fetch("/api/trends")
      .then((r) => (r.ok ? (r.json() as Promise<TrendsResponse>) : null))
      .then((d) => alive && setData(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const topics = useMemo(() => (data?.status === "ok" && data.snapshot ? data.snapshot.topics.filter((t) => t.videos.length > 0) : []), [data]);
  const trendingIds = useMemo(() => new Set(data?.trends.filter((t) => t.trending).map((t) => t.id) ?? []), [data]);

  const videos = useMemo(() => {
    const pick = topic === "all" ? topics : topic === "trending" ? topics.filter((t) => trendingIds.has(t.id)) : topics.filter((t) => t.id === topic);
    // Interleave topics so the row feels varied, newest first within each.
    const lists = pick.map((t) => [...t.videos].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")));
    const out: SocialVideo[] = [];
    const seen = new Set<string>();
    for (let i = 0; out.length < 18 && lists.some((l) => l[i]); i++) {
      for (const l of lists) {
        const v = l[i];
        if (v && !seen.has(`${v.platform}:${v.id}`)) {
          seen.add(`${v.platform}:${v.id}`);
          out.push(v);
        }
      }
    }
    return out;
  }, [topics, topic, trendingIds]);

  if (topics.length === 0) {
    if (kitchen.length === 0) return null;
    return (
      <section aria-labelledby="rail-title" className="container-page pt-6 sm:pt-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 id="rail-title" className="text-[1.25rem] leading-tight tracking-[-0.01em] sm:text-[1.5rem]">
            From the Fridge Rescue kitchen
          </h2>
          <Link href="/recipes" className="shrink-0 text-[0.8125rem] font-medium text-accent hover:underline">
            All recipes
          </Link>
        </div>
        <ul className={ROW}>
          {kitchen.map((r, i) => (
            <li key={r.slug} className="w-[9.25rem] shrink-0 snap-start sm:w-[11rem]">
              <Link href={`/recipes/${r.slug}`} className="group block">
                <span className="relative block aspect-[3/4] overflow-hidden rounded-[0.875rem] bg-cream-deep">
                  <Image src={r.image} alt="" fill sizes="176px" priority={i < 2} className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
                </span>
                <span className="mt-2 line-clamp-2 block text-[0.8125rem] font-medium leading-snug text-ink">{r.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{r.totalMinutes} min · Tested recipe</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const trending = data?.mode === "trending" && trendingIds.size > 0;
  return (
    <section aria-labelledby="rail-title" className="container-page pt-6 sm:pt-8">
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="rail-title" className="text-[1.25rem] leading-tight tracking-[-0.01em] sm:text-[1.5rem]">
          {topic === "trending" ? "Trending food" : "Fresh food inspiration"}
        </h2>
        <div role="tablist" aria-label="Video categories" className={cn(ROW, "gap-1.5 pb-0 sm:mx-0 sm:scroll-px-0 sm:px-0 xl:mx-0 xl:scroll-px-0 xl:px-0")}>
          {[{ id: "all", label: "For you" }, ...(trending ? [{ id: "trending", label: "Trending food" }] : []), ...topics.map((t) => ({ id: t.id, label: t.label }))].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={topic === t.id}
              onClick={() => setTopic(t.id)}
              className={cn(
                "inline-flex min-h-8 shrink-0 items-center rounded-[0.5rem] px-2.5 text-[0.8125rem] font-medium transition-colors",
                topic === t.id ? "bg-ink text-paper" : "bg-ink/[0.05] text-ink-soft hover:bg-ink/[0.09] hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <ul className={ROW}>
        {videos.map((v) => (
          <li key={`${v.platform}:${v.id}`} className="w-[9.25rem] shrink-0 snap-start sm:w-[11rem]">
            <ShortCard video={v} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShortCard({ video }: { video: SocialVideo }) {
  const [watching, setWatching] = useState(false);
  const toast = useToast();
  const embed = video.platform === "youtube" && video.embeddable ? youTubeEmbedUrl(video.id) : null;
  const date = when(video.publishedAt);

  const makeLikeThis = () => {
    setInspiration({ title: video.title.slice(0, 200), creator: video.creator.slice(0, 100), platform: video.platform, url: video.url });
    const cook = document.getElementById("cook");
    cook?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("hero-ingredients")?.focus({ preventScroll: true }), 400);
    toast.show("Add your ingredients and Fridge AI will make its own version", { tone: "info" });
  };

  return (
    <article className="group">
      <button
        type="button"
        onClick={() => (embed ? setWatching(true) : window.open(video.url, "_blank", "noopener,noreferrer"))}
        className="relative block aspect-[3/4] w-full overflow-hidden rounded-[0.875rem] bg-charcoal text-left"
        aria-label={`Watch “${video.title}” by ${video.creator} on ${PLATFORM_LABEL[video.platform]}`}
      >
        {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt="" fill sizes="176px" className="object-cover transition-transform duration-500 group-hover:scale-[1.05] motion-reduce:transition-none" />}
        <span className="absolute left-2 top-2 rounded-[0.25rem] bg-paper/95 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-ink">{PLATFORM_LABEL[video.platform]}</span>
        <span className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-paper/95 text-ink shadow-lift transition-transform group-hover:scale-105">
          <Play className="ml-0.5 size-3.5 fill-current" aria-hidden />
        </span>
      </button>
      <h3 className="mt-2 line-clamp-2 font-sans text-[0.8125rem] font-medium leading-snug tracking-normal text-ink">{video.title}</h3>
      <p className="mt-0.5 truncate text-xs text-muted">
        {video.creator}
        {date && ` · ${date}`}
      </p>
      <button type="button" onClick={makeLikeThis} className="mt-1.5 inline-flex min-h-8 items-center gap-1 rounded-[0.375rem] text-xs font-medium text-accent hover:underline">
        <ChefHat className="size-3.5" aria-hidden /> Make something like this
      </button>

      <Dialog open={watching} onClose={() => setWatching(false)} title={video.title} description={`${video.creator} · ${PLATFORM_LABEL[video.platform]}`} size="lg">
        {watching && embed && (
          <div className="relative aspect-video overflow-hidden rounded-[0.625rem] bg-charcoal">
            <iframe src={embed} title={video.title} className="absolute inset-0 size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
            Open on {PLATFORM_LABEL[video.platform]} <ExternalLink className="size-3" aria-hidden />
          </a>
          <button
            type="button"
            onClick={() => {
              setWatching(false);
              makeLikeThis();
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-[0.5rem] bg-charcoal px-3 text-[0.8125rem] font-medium text-white hover:bg-charcoal/90"
          >
            <ChefHat className="size-4" aria-hidden /> Make something like this
          </button>
        </div>
      </Dialog>
    </article>
  );
}
