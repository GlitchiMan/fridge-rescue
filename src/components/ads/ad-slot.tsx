"use client";

import { useEffect, useRef } from "react";
import { useKitchen } from "@/hooks/use-kitchen";
import { getAdsConfig } from "@/lib/ads/config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Advertising slot. Renders NOTHING by default.
 *
 * Placement rules (enforced by where this component is used):
 * - only on public content pages, after useful content
 * - never inside controls, ingredient lists, instructions or cooking mode
 * - reserves its height to avoid layout shift, and is clearly labelled
 */
export function AdSlot({ slot, minHeight = 280 }: { slot: string; minHeight?: number }) {
  const config = getAdsConfig();
  const { data, hydrated } = useKitchen();
  const pushed = useRef(false);
  const live = config.enabled && hydrated && data.consent.advertising;

  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blockers etc. */
    }
  }, [live]);

  if (live && config.client) {
    return (
      <aside data-ad-slot aria-label="Advertisement" className="no-print my-10">
        <p className="mb-1 text-center text-[0.7rem] font-semibold uppercase tracking-widest text-muted">Advertisement</p>
        <div style={{ minHeight }} className="overflow-hidden rounded-2xl bg-surface">
          <ins
            className="adsbygoogle"
            style={{ display: "block", minHeight }}
            data-ad-client={config.client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </aside>
    );
  }

  if (config.showPlaceholders) {
    return (
      <aside data-ad-slot aria-hidden className="no-print my-10">
        <div
          style={{ minHeight }}
          className="flex items-center justify-center rounded-2xl border-2 border-dashed border-muted/40 bg-[repeating-linear-gradient(45deg,#eee,#eee_10px,#f6f6f6_10px,#f6f6f6_20px)] text-sm font-mono text-muted"
        >
          DEV AD PLACEHOLDER · slot “{slot}” · not a real ad
        </div>
      </aside>
    );
  }

  return null;
}
