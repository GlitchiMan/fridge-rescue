"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { VideoResults } from "./video-results";

/** "Watch it made" on a recipe page. Loads only when asked, to save API quota. */
export function RecipeVideos({ slug, title }: { slug: string; title: string }) {
  const [show, setShow] = useState(false);
  return (
    <section aria-labelledby="videos" className="no-print mt-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="videos" className="font-display text-[1.375rem]">Watch it made</h2>
          <p className="mt-1 text-sm text-muted">Real cooking videos from YouTube creators for this dish.</p>
        </div>
        {!show && (
          <button type="button" onClick={() => setShow(true)} className={buttonClass("secondary", "md", "self-start")}>
            <Play className="size-4" aria-hidden /> Find cooking videos
          </button>
        )}
      </div>
      {show && (
        <div className="mt-5">
          <VideoResults params={`recipe=${encodeURIComponent(slug)}`} fallbackQuery={`${title} recipe`} limit={3} columns="sm:grid-cols-2 xl:grid-cols-3" />
        </div>
      )}
    </section>
  );
}
