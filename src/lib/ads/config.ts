/**
 * Advertising configuration. Ads are OFF unless explicitly enabled AND a real
 * AdSense publisher id is configured. We never ship a made-up publisher id.
 */
export interface AdsConfig {
  enabled: boolean;
  client: string | null;
  showPlaceholders: boolean;
}

export function getAdsConfig(): AdsConfig {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || null;
  const validClient = client && /^ca-pub-\d{10,20}$/.test(client) ? client : null;
  return {
    enabled: process.env.NEXT_PUBLIC_ADS_ENABLED === "true" && Boolean(validClient),
    client: validClient,
    showPlaceholders: process.env.NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS === "true",
  };
}
