import type { CountUnit, Dimension, Ingredient, IngredientQuantity, Unit } from "@/types";
import { COUNT_UNITS, MASS_UNITS, UNITS, VOLUME_UNITS } from "@/types";

/** Factors to the base unit of each dimension (g for mass, ml for volume). */
const MASS_TO_G: Record<(typeof MASS_UNITS)[number], number> = { g: 1, kg: 1000 };
/**
 * Volume factors. tsp/tbsp use the common metric kitchen measures (5 ml/15 ml).
 * "cup" uses 240 ml (the US legal cup); it is labelled "cup (240 ml)" in the UI.
 */
const VOLUME_TO_ML: Record<(typeof VOLUME_UNITS)[number], number> = {
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 240,
};

export const UNIT_LABELS: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "L",
  tsp: "tsp",
  tbsp: "tbsp",
  cup: "cup",
  pcs: "pcs",
  clove: "clove",
  slice: "slice",
  can: "can",
  pinch: "pinch",
};

export const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: "pcs", label: "pieces" },
  { value: "g", label: "grams (g)" },
  { value: "kg", label: "kilograms (kg)" },
  { value: "ml", label: "millilitres (ml)" },
  { value: "l", label: "litres (L)" },
  { value: "tbsp", label: "tablespoons" },
  { value: "tsp", label: "teaspoons" },
  { value: "cup", label: "cups (240 ml)" },
  { value: "can", label: "cans" },
  { value: "slice", label: "slices" },
  { value: "clove", label: "cloves" },
];

export function isUnit(value: unknown): value is Unit {
  return typeof value === "string" && (UNITS as readonly string[]).includes(value);
}

export function dimensionOf(unit: Unit): Dimension {
  if ((MASS_UNITS as readonly string[]).includes(unit)) return "mass";
  if ((VOLUME_UNITS as readonly string[]).includes(unit)) return "volume";
  return `count:${unit as CountUnit}`;
}

export function isCountUnit(unit: Unit): unit is CountUnit {
  return (COUNT_UNITS as readonly string[]).includes(unit);
}

export function areUnitsCompatible(a: Unit, b: Unit): boolean {
  return dimensionOf(a) === dimensionOf(b);
}

/** Amount expressed in its dimension's base unit (g, ml, or the count unit itself). */
export function toBase(quantity: number, unit: Unit): number {
  if (unit in MASS_TO_G) return quantity * MASS_TO_G[unit as keyof typeof MASS_TO_G];
  if (unit in VOLUME_TO_ML) return quantity * VOLUME_TO_ML[unit as keyof typeof VOLUME_TO_ML];
  return quantity;
}

export function baseUnitOf(unit: Unit): Unit {
  const d = dimensionOf(unit);
  if (d === "mass") return "g";
  if (d === "volume") return "ml";
  return unit;
}

/**
 * Convert between compatible units. Returns `null` when units are not
 * compatible – callers must handle that explicitly.
 */
export function convertCompatibleUnits(quantity: number, from: Unit, to: Unit): number | null {
  if (!areUnitsCompatible(from, to)) return null;
  const base = toBase(quantity, from);
  return base / toBase(1, to);
}

/**
 * Approximate conversion between pieces and grams using a documented typical
 * piece weight. Always returns `approximate: true` so the UI can label it.
 */
export function approximateConvert(
  quantity: number,
  from: Unit,
  to: Unit,
  ingredient: Pick<Ingredient, "approxGramsPerPiece"> | undefined,
): { value: number; approximate: true } | null {
  const per = ingredient?.approxGramsPerPiece;
  if (!per) return null;
  const fromD = dimensionOf(from);
  const toD = dimensionOf(to);
  if (fromD === "count:pcs" && toD === "mass") {
    return { value: (quantity * per) / toBase(1, to), approximate: true };
  }
  if (fromD === "mass" && toD === "count:pcs") {
    return { value: toBase(quantity, from) / per, approximate: true };
  }
  return null;
}

export function scaleQuantity(q: IngredientQuantity, factor: number): IngredientQuantity {
  if (q.quantity === null || !Number.isFinite(factor) || factor <= 0) return { ...q };
  return { quantity: q.quantity * factor, unit: q.unit };
}

/**
 * Pick a friendly unit after scaling (e.g. 1500 g → 1.5 kg, 0.25 tbsp → ¾ tsp).
 */
export function normalizeForDisplay(q: IngredientQuantity): IngredientQuantity {
  if (q.quantity === null) return q;
  const { quantity, unit } = q;
  if (unit === "g" && quantity >= 1000) return { quantity: quantity / 1000, unit: "kg" };
  if (unit === "kg" && quantity < 1) return { quantity: quantity * 1000, unit: "g" };
  if (unit === "ml" && quantity >= 1000) return { quantity: quantity / 1000, unit: "l" };
  if (unit === "l" && quantity < 1) return { quantity: quantity * 1000, unit: "ml" };
  if (unit === "tbsp" && quantity < 1) return { quantity: quantity * 3, unit: "tsp" };
  if (unit === "tsp" && quantity >= 3 && Math.abs((quantity / 3) % 0.5) < 1e-9) {
    return { quantity: quantity / 3, unit: "tbsp" };
  }
  return q;
}

const FRACTIONS: [number, string][] = [
  [0.125, "⅛"],
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

/** Human-readable number: fractions for spoon/cup/count units, rounding for metric. */
export function formatNumber(value: number, unit: Unit): string {
  if (!Number.isFinite(value)) return "";
  const useFractions = !["g", "kg", "ml", "l"].includes(unit);
  if (useFractions) {
    const whole = Math.floor(value + 1e-9);
    const rest = value - whole;
    if (rest < 0.06) return String(whole || (value > 0 ? "a little" : "0"));
    if (rest > 0.94) return String(whole + 1);
    let best = FRACTIONS[0]!;
    for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
    return whole > 0 ? `${whole} ${best[1]}` : best[1];
  }
  if (unit === "g" || unit === "ml") {
    if (value >= 100) return String(Math.round(value / 5) * 5);
    if (value >= 10) return String(Math.round(value));
    return String(Math.round(value * 10) / 10);
  }
  return String(Math.round(value * 100) / 100);
}

/** Formats e.g. "400 g", "2 eggs", "1 ½ tbsp", or "amount unknown". */
export function formatQuantity(
  q: IngredientQuantity,
  ingredient?: Pick<Ingredient, "noun"> | null,
  opts: { normalize?: boolean } = {},
): string {
  if (q.quantity === null) return "amount unknown";
  const nq = opts.normalize === false ? q : normalizeForDisplay(q);
  const num = formatNumber(nq.quantity!, nq.unit);
  const plural = (nq.quantity ?? 0) > 1 + 1e-9;
  if (nq.unit === "pcs") {
    if (ingredient?.noun) return `${num} ${plural ? ingredient.noun.other : ingredient.noun.one}`;
    return `${num}`;
  }
  if (nq.unit === "slice" || nq.unit === "clove" || nq.unit === "can" || nq.unit === "pinch") {
    const word = nq.unit === "pinch" ? (plural ? "pinches" : "pinch") : `${nq.unit}${plural ? "s" : ""}`;
    return `${num} ${word}`;
  }
  if (nq.unit === "cup") return `${num} ${plural ? "cups" : "cup"}`;
  return `${num} ${UNIT_LABELS[nq.unit]}`;
}
