"use client";

import { useEffect, useState } from "react";

type Palette = "forest" | "sage" | "champagne" | "midnight";
type Mode = "system" | "light" | "dark";
type Appearance = { palette: Palette; mode: Mode };

const KEY = "fridge-rescue:appearance";
const PALETTES: { value: Palette; name: string; swatch: string }[] = [
  { value: "forest", name: "Forest", swatch: "#183c31" },
  { value: "sage", name: "Sage", swatch: "#738d79" },
  { value: "champagne", name: "Champagne", swatch: "#9d7557" },
  { value: "midnight", name: "Midnight", swatch: "#34475b" },
];
const MODES: Mode[] = ["system", "light", "dark"];

function validAppearance(value: unknown): value is Appearance {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Record<string, unknown>;
  return PALETTES.some((p) => p.value === a.palette) && MODES.some((m) => m === a.mode);
}

/**
 * A local, optional appearance setting. This intentionally does not imply
 * a signed-in account or cross-device synchronization.
 */
export function AppearanceControls() {
  const [appearance, setAppearance] = useState<Appearance>({ palette: "forest", mode: "system" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (validAppearance(parsed)) setAppearance(parsed);
      }
    } catch {
      // Private browsing and blocked storage must not stop the app working.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.palette = appearance.palette;
      document.documentElement.dataset.mode =
        appearance.mode === "system" ? (media.matches ? "dark" : "light") : appearance.mode;
    };
    apply();
    media.addEventListener("change", apply);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(appearance));
    } catch {
      // Appearance still works for this visit.
    }
    return () => media.removeEventListener("change", apply);
  }, [appearance, ready]);

  return (
    <section aria-labelledby="appearance-title" className="grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <div>
        <h3 id="appearance-title" className="text-2xl">Make it yours</h3>
        <p className="mt-1 text-sm text-muted">Choose your colors and lighting. Saved on this device for now.</p>
      </div>
      <fieldset>
        <legend className="label">Color collection</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PALETTES.map((palette) => (
            <button key={palette.value} type="button" aria-pressed={appearance.palette === palette.value}
              onClick={() => setAppearance((a) => ({ ...a, palette: palette.value }))}
              className={`flex min-h-14 items-center gap-2.5 rounded-xl border px-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${appearance.palette === palette.value ? "border-forest ring-2 ring-forest/20" : "border-line hover:border-line-strong"}`}>
              <span aria-hidden="true" className="size-5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: palette.swatch }} />
              {palette.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Display mode</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((mode) => (
            <button key={mode} type="button" aria-pressed={appearance.mode === mode}
              onClick={() => setAppearance((a) => ({ ...a, mode }))}
              className={`min-h-10 rounded-lg border px-4 text-sm font-medium capitalize transition-colors ${appearance.mode === mode ? "border-forest bg-forest text-white" : "border-line-strong hover:border-forest"}`}>
              {mode}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
