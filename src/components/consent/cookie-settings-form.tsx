"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { getAdsConfig } from "@/lib/ads/config";
import { setAnalyticsConsent } from "@/lib/analytics/events";

function Row({ title, desc, checked, onChange, disabled, id }: { title: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; id: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-white p-4">
      <div>
        <label htmlFor={id} className="font-semibold">{title}</label>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
      <input id={id} type="checkbox" role="switch" className="mt-1 size-6 shrink-0 accent-forest" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
    </div>
  );
}

export function CookieSettingsForm() {
  const { data, hydrated } = useKitchen();
  const toast = useToast();
  const [draft, setDraft] = useState<{ analytics: boolean; advertising: boolean } | null>(null);
  const current = draft ?? { analytics: data.consent.analytics, advertising: data.consent.advertising };
  const adsConfigured = getAdsConfig().enabled;

  const save = (v: { analytics: boolean; advertising: boolean }) => {
    kitchenStore.setConsent(v);
    setAnalyticsConsent(v.analytics);
    setDraft(null);
    toast.show("Your choices are saved");
  };

  if (!hydrated) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-3">
      <Row id="c-essential" title="Essential storage (always on)" desc="Saves your kitchen, lists, plan and these choices in your browser so the features you use work. Nothing is sent to us." checked disabled />
      <Row
        id="c-analytics"
        title="Anonymous usage statistics"
        desc="Not currently in use. If we add privacy-friendly analytics, it will only run with this switched on, and will never include your ingredients."
        checked={current.analytics}
        onChange={(v) => setDraft({ ...current, analytics: v })}
      />
      <Row
        id="c-ads"
        title="Advertising"
        desc={adsConfigured ? "Allows Google AdSense to show ads, which may use cookies. Ads help keep Fridge Rescue free." : "Ads aren't shown at the moment. If we introduce them, this choice will decide whether ad scripts are loaded."}
        checked={current.advertising}
        onChange={(v) => setDraft({ ...current, advertising: v })}
      />
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" className={buttonClass("primary", "md")} onClick={() => save(current)}>Save choices</button>
        <button type="button" className={buttonClass("secondary", "md")} onClick={() => save({ analytics: false, advertising: false })}>Reject all optional</button>
        <button type="button" className={buttonClass("secondary", "md")} onClick={() => save({ analytics: true, advertising: true })}>Accept all</button>
      </div>
      <p className="text-sm text-muted">
        {data.consent.decided && data.consent.updatedAt
          ? `Last saved ${new Date(data.consent.updatedAt).toLocaleString()}.`
          : "You haven't made a choice yet – optional features stay off until you do."}
      </p>
    </div>
  );
}
