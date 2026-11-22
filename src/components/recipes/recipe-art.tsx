import { getIngredient } from "@/data/ingredients";
import type { RecipeCategory, RecipeIngredient } from "@/types";

/** Deterministic PRNG so every recipe always gets the same illustration. */
function seeded(seedText: string) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BACKGROUNDS: Partial<Record<RecipeCategory, [string, string]>> = {
  breakfast: ["#FCEFD6", "#F7DFB2"],
  soup: ["#FBE3D3", "#F5CDB2"],
  pasta: ["#F8EBCF", "#F1D9A8"],
  rice: ["#E6F1E4", "#CFE4CC"],
  salad: ["#E3F0DA", "#C9E2BB"],
  dessert: ["#FBE3DD", "#F4CABF"],
  snack: ["#F4ECDD", "#E9DAC0"],
  dinner: ["#E9F0E6", "#D3E2CE"],
  lunch: ["#F3EFE2", "#E6DEC6"],
};

const BOWL_CATEGORIES: RecipeCategory[] = ["soup", "one-pot"];

interface Props {
  slug: string;
  categories: RecipeCategory[];
  ingredients: RecipeIngredient[];
  className?: string;
}

/**
 * Original, stylised top-down illustration composed from the recipe's actual
 * ingredient colours. Purely decorative (aria-hidden) – never presented as a
 * photograph of the finished dish.
 */
export function RecipeArt({ slug, categories, ingredients, className = "" }: Props) {
  const rand = seeded(slug);
  const primary = categories.find((c) => BACKGROUNDS[c]) ?? "dinner";
  const [bgA, bgB] = BACKGROUNDS[primary] ?? BACKGROUNDS.dinner!;
  const isBowl = categories.some((c) => BOWL_CATEGORIES.includes(c)) || slug.includes("curry");

  const STAPLE_IDS = new Set(["salt", "black-pepper", "water", "cooking-oil", "olive-oil", "sugar", "baking-powder", "baking-soda", "vanilla"]);
  const colors = ingredients
    .filter((i) => !STAPLE_IDS.has(i.ingredientId))
    .map((i) => getIngredient(i.ingredientId)?.color)
    .filter((c): c is string => Boolean(c));
  const palette = colors.length ? colors : ["#F2A65A", "#6FAF7B", "#E97762"];
  const base = palette[0]!;
  const herbs = ingredients.some((i) => ["parsley", "basil", "cilantro", "spring-onion", "spinach", "kale"].includes(i.ingredientId));

  const blobs = Array.from({ length: 11 }, (_, k) => {
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * (isBowl ? 58 : 66);
    return {
      cx: 200 + Math.cos(angle) * dist,
      cy: 158 + Math.sin(angle) * dist * 0.92,
      rx: 9 + rand() * 15,
      ry: 7 + rand() * 11,
      rot: Math.round(rand() * 180),
      fill: palette[(k % (palette.length - (palette.length > 1 ? 1 : 0))) + (palette.length > 1 ? 1 : 0)] ?? base,
    };
  });
  const leaves = herbs
    ? Array.from({ length: 5 }, () => ({
        x: 200 + (rand() - 0.5) * 120,
        y: 158 + (rand() - 0.5) * 100,
        r: Math.round(rand() * 360),
      }))
    : [];
  const dots = Array.from({ length: 16 }, () => ({ x: rand() * 400, y: rand() * 300, r: 1.5 + rand() * 2.5 }));

  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg-${slug}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bgA} />
          <stop offset="1" stopColor={bgB} />
        </linearGradient>
        <radialGradient id={`plate-${slug}`} cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F3EEE3" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#bg-${slug})`} />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#FFFFFF" opacity="0.35" />
      ))}
      {/* shadow */}
      <ellipse cx="206" cy="170" rx="118" ry="112" fill="#24332A" opacity="0.10" />
      {/* plate / bowl */}
      <circle cx="200" cy="158" r="112" fill={`url(#plate-${slug})`} />
      <circle cx="200" cy="158" r="112" fill="none" stroke="#24332A" strokeOpacity="0.06" strokeWidth="2" />
      <circle cx="200" cy="158" r={isBowl ? 86 : 88} fill="none" stroke="#24332A" strokeOpacity="0.05" strokeWidth="2" />
      {isBowl && <circle cx="200" cy="158" r="82" fill={base} opacity="0.9" />}
      {!isBowl && <ellipse cx="200" cy="158" rx="76" ry="70" fill={base} opacity="0.85" />}
      {blobs.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} transform={`rotate(${b.rot} ${b.cx} ${b.cy})`} fill={b.fill} stroke="#24332A" strokeOpacity="0.08" />
      ))}
      {leaves.map((l, i) => (
        <path
          key={i}
          d="M0 0c4-8 12-10 18-8-2 7-9 11-18 8z"
          transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}
          fill="#3F8A4A"
          opacity="0.9"
        />
      ))}
      {/* cutlery hint */}
      <rect x="332" y="70" width="7" height="170" rx="3.5" fill="#FFFFFF" opacity="0.75" />
      <rect x="52" y="70" width="7" height="170" rx="3.5" fill="#FFFFFF" opacity="0.75" />
    </svg>
  );
}
