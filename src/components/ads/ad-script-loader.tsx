"use client";

import Script from "next/script";
import { useKitchen } from "@/hooks/use-kitchen";
import { getAdsConfig } from "@/lib/ads/config";

/**
 * Loads the AdSense script only when:
 *  1. ads are enabled via env AND a real publisher id is configured, and
 *  2. the visitor has explicitly consented to advertising on /cookie-settings.
 *
 * NOTE: Serving personalised ads to visitors in the EEA/UK/Switzerland requires
 * a Google-certified CMP (TCF). Integrate one before enabling ads for those
 * regions – see README "Advertising".
 */
export function AdScriptLoader() {
  const config = getAdsConfig();
  const { data, hydrated } = useKitchen();
  if (!config.enabled || !config.client || !hydrated || !data.consent.advertising) return null;
  return (
    <Script
      id="adsense"
      strategy="lazyOnload"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.client)}`}
    />
  );
}
