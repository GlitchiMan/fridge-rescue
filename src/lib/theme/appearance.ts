/** Appearance model shared by the pre-paint script, settings UI and account sync. */
export const PALETTES = [
  { value: "forest", name: "Forest", fill: "#183C31", tint: "#9DAE9B" },
  { value: "sage", name: "Sage", fill: "#4A6552", tint: "#C4D0C3" },
  { value: "champagne", name: "Champagne", fill: "#7C5A40", tint: "#BD9475" },
  { value: "midnight", name: "Midnight", fill: "#2B4558", tint: "#9FB6C6" },
] as const;
export const MODES = ["system", "light", "dark"] as const;

export type Palette = (typeof PALETTES)[number]["value"];
export type ThemeMode = (typeof MODES)[number];
export interface Appearance {
  palette: Palette;
  mode: ThemeMode;
}

export const APPEARANCE_KEY = "fridge-rescue:appearance";
export const DEFAULT_APPEARANCE: Appearance = { palette: "forest", mode: "system" };

export function parseAppearance(value: unknown): Appearance | null {
  if (typeof value !== "object" || value === null) return null;
  const a = value as Record<string, unknown>;
  if (!PALETTES.some((p) => p.value === a.palette) || !MODES.some((m) => m === a.mode)) return null;
  return { palette: a.palette as Palette, mode: a.mode as ThemeMode };
}

export const resolveMode = (mode: ThemeMode, systemDark: boolean): "light" | "dark" => (mode === "system" ? (systemDark ? "dark" : "light") : mode);

/**
 * Runs inline before first paint so a saved theme never flashes.
 * Kept dependency-free; values are validated against fixed lists.
 */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,a={};try{a=JSON.parse(localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)}))||{}}catch(e){}var p=${JSON.stringify(PALETTES.map((x) => x.value))}.indexOf(a.palette)>=0?a.palette:"forest",m=["light","dark"].indexOf(a.mode)>=0?a.mode:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.palette=p;d.dataset.mode=m;}catch(e){}})();`;
