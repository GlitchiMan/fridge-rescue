// Pure checks for AI output (no network) – unit-tested.
// The model proposes; the app decides what the user actually has, what is
// missing, and whether amounts, steps and restrictions make sense.
import type { DietaryTag } from "@/types";
import {
  GEN_UNITS,
  type AiIdeas,
  type AiRecipe,
  type GenUnit,
  type GeneratedIdea,
  type GeneratedRecipe,
  type GenerateContext,
  type IdeasRequest,
  type RecipeRequest,
} from "./schema";

/* ───────────── Ingredient names ───────────── */

/** Words that describe a form or cut, not a different food. */
const MODIFIERS = new Set([
  "fresh", "large", "small", "medium", "big", "boneless", "skinless", "cooked", "leftover", "raw", "ripe", "chopped", "diced",
  "sliced", "grated", "shredded", "minced", "ground", "crushed", "breast", "thigh", "fillet", "leg", "drumstick", "wing",
  "whole", "free", "range", "organic", "plain", "white", "yolk", "clove", "juice", "zest", "of", "a", "the", "and",
]);

function singular(t: string): string {
  if (t.length <= 3) return t;
  if (t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.endsWith("oes")) return t.slice(0, -2);
  if (/(ches|shes|sses|xes)$/.test(t)) return t.slice(0, -2);
  if (t.endsWith("s") && !/(ss|us|is)$/.test(t)) return t.slice(0, -1);
  return t;
}

function tokens(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .filter((t) => !MODIFIERS.has(t));
}

export function normalizeName(name: string): string {
  return tokens(name).join(" ");
}

/**
 * Same food? "cheese" ≈ "cheddar cheese", "chicken" ≈ "chicken thighs",
 * but "chicken" ≠ "chicken stock" and "tomato" ≠ "tomato paste".
 */
export function sameIngredient(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta.join(" ") === tb.join(" ")) return true;
  if (ta[ta.length - 1] !== tb[tb.length - 1]) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.includes(t));
}

const findIn = (list: string[], name: string) => list.find((x) => sameIngredient(x, name));

/* ───────────── Diets and allergies ───────────── */

const words = (s: string) => ` ${tokens(s).join(" ")} `;
const hasAny = (name: string, terms: string[]) => {
  const w = words(name);
  return terms.some((t) => w.includes(` ${tokens(t).join(" ")} `));
};

const MEAT_FISH = [
  "chicken", "beef", "pork", "bacon", "ham", "lamb", "turkey", "sausage", "chorizo", "salami", "pepperoni", "prosciutto", "pancetta",
  "veal", "duck", "steak", "meatball", "mince", "gelatin", "gelatine", "lard", "anchovy", "fish", "salmon", "tuna", "cod", "haddock",
  "mackerel", "sardine", "shrimp", "prawn", "crab", "lobster", "mussel", "clam", "oyster", "squid", "scallop", "fish sauce",
  "oyster sauce", "worcestershire", "bone broth", "meat",
];
const DAIRY = [
  "milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "ghee", "parmesan", "mozzarella", "cheddar", "feta", "ricotta",
  "mascarpone", "paneer", "halloumi", "brie", "gouda", "creme fraiche", "kefir", "whey", "buttermilk", "custard",
];
const EGG = ["egg", "mayonnaise", "mayo", "aioli", "meringue"];
const GLUTEN = [
  "flour", "wheat", "bread", "breadcrumb", "panko", "pasta", "spaghetti", "noodle", "couscous", "bulgur", "barley", "rye", "semolina",
  "soy sauce", "tortilla", "pita", "naan", "crouton", "beer", "seitan", "farro", "spelt", "orzo", "lasagne", "lasagna", "macaroni",
  "penne", "fusilli", "gnocchi", "cracker", "pastry", "udon", "ramen", "wonton", "bun", "bagel", "brioche",
];
const NUTS = ["almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio", "macadamia", "pine nut", "brazil nut", "peanut", "nut", "praline", "marzipan"];
const SHELLFISH = ["shrimp", "prawn", "crab", "lobster", "mussel", "clam", "oyster", "scallop", "crayfish", "langoustine"];
const FISH = ["fish", "salmon", "tuna", "cod", "haddock", "mackerel", "sardine", "anchovy", "trout", "tilapia", "fish sauce"];
const SOY = ["soy", "soya", "tofu", "tempeh", "edamame", "miso", "tamari"];
const SESAME = ["sesame", "tahini"];

/** Names that look like a restricted food but are explicitly the free-from version. */
const FREE_FROM = /\b(vegan|plant based|plant-based|meat free|meat-free|meatless|dairy free|dairy-free|gluten free|gluten-free|egg free|egg-free|vegetarian)\b/i;
const DAIRY_SAFE = /\b(peanut butter|almond butter|nut butter|cashew butter|cocoa butter|butter beans?|coconut (milk|cream)|(oat|almond|soy|soya|rice|cashew) milk|cream of tartar)\b/i;
const GLUTEN_SAFE = /\b((rice|almond|coconut|chickpea|corn|buckwheat|oat) flour|cornflour|cornstarch|tamari|rice noodles?|corn tortillas?|rice paper|buckwheat)\b/i;
const NUT_SAFE = /\b(nutmeg|coconut|butternut|water chestnut)\b/i;

const DIET_RULES: Record<DietaryTag, { label: string; terms: string[]; safe?: RegExp }> = {
  vegetarian: { label: "isn't vegetarian", terms: MEAT_FISH },
  vegan: { label: "isn't vegan", terms: [...MEAT_FISH, ...DAIRY, ...EGG, "honey"], safe: DAIRY_SAFE },
  "dairy-free": { label: "contains dairy", terms: DAIRY, safe: DAIRY_SAFE },
  "gluten-free": { label: "may contain gluten", terms: GLUTEN, safe: GLUTEN_SAFE },
};

/** Expand common allergy words into the foods they cover. */
function avoidTerms(avoid: string): { terms: string[]; safe?: RegExp } {
  const a = normalizeName(avoid);
  if (/^(tree )?nut$|^nut allergy$/.test(a)) return { terms: NUTS, safe: NUT_SAFE };
  if (a === "peanut") return { terms: ["peanut", "satay"] };
  if (/^(dairy|lactose|milk)$/.test(a)) return { terms: DAIRY, safe: DAIRY_SAFE };
  if (/^(gluten|wheat)$/.test(a)) return { terms: GLUTEN, safe: GLUTEN_SAFE };
  if (a === "egg") return { terms: EGG };
  if (a === "shellfish") return { terms: SHELLFISH };
  if (a === "fish") return { terms: FISH };
  if (/^(soy|soya)$/.test(a)) return { terms: [...SOY, "soy sauce"] };
  if (a === "sesame") return { terms: SESAME };
  return { terms: [avoid] };
}

/** Every name that conflicts with the user's diets or avoid list, with a reason. */
export function findRestrictionConflicts(names: string[], diets: DietaryTag[], avoid: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    if (!name.trim()) continue;
    for (const d of diets) {
      const rule = DIET_RULES[d];
      if (FREE_FROM.test(name) || rule.safe?.test(name)) continue;
      if (hasAny(name, rule.terms)) out.push(`${name} ${rule.label}`);
    }
    for (const a of avoid) {
      const { terms, safe } = avoidTerms(a);
      if (safe?.test(name) && !hasAny(name.replace(safe, " "), terms)) continue;
      if (hasAny(name, terms)) out.push(`${name} conflicts with “${a}”`);
    }
  }
  return Array.from(new Set(out));
}

/* ───────────── Units and amounts ───────────── */

const UNIT_ALIASES: Record<string, GenUnit> = {
  g: "g", gram: "g", grams: "g", gr: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tbs: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup",
  "": "pcs", pc: "pcs", pcs: "pcs", piece: "pcs", pieces: "pcs", whole: "pcs", large: "pcs", medium: "pcs", small: "pcs", item: "pcs", items: "pcs",
  clove: "clove", cloves: "clove",
  slice: "slice", slices: "slice",
  can: "can", cans: "can", tin: "can", tins: "can",
  pinch: "pinch", pinches: "pinch",
  "to taste": "to taste", "as needed": "to taste", taste: "to taste", "to serve": "to taste", "for serving": "to taste",
};

/** Largest sensible amount per unit for a home recipe of up to 12 servings. */
const UNIT_MAX: Record<GenUnit, number> = {
  g: 5000, kg: 5, ml: 5000, l: 5, tsp: 30, tbsp: 24, cup: 12, pcs: 40, clove: 20, slice: 30, can: 6, pinch: 6, "to taste": 0,
};

export function normalizeUnit(unit: string): GenUnit | null {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  return UNIT_ALIASES[u] ?? ((GEN_UNITS as readonly string[]).includes(u) ? (u as GenUnit) : null);
}

/* ───────────── Food safety (written by the app, not the model) ───────────── */

export function safetyGuidance(ingredientNames: string[], stepText: string): string[] {
  const all = ingredientNames.join(" | ");
  const has = (terms: string[]) => ingredientNames.some((n) => hasAny(n, terms));
  const notes: string[] = [];
  if (has(["chicken", "turkey", "duck", "poultry"])) notes.push("Cook chicken and other poultry until the thickest part reaches 74 °C (165 °F) with no pink meat. A food thermometer is the reliable check.");
  if (has(["mince", "ground beef", "ground pork", "ground lamb", "ground turkey", "sausage", "burger", "meatball"]) || /\b(minced|ground) (beef|pork|lamb|meat)\b/i.test(all))
    notes.push("Cook minced meat and sausages to 71 °C (160 °F) all the way through, with no pink in the middle.");
  if (has(["steak", "pork", "beef", "lamb", "veal"])) notes.push("Cook whole cuts of beef, pork or lamb to at least 63 °C (145 °F), then rest for 3 minutes.");
  if (has([...FISH, ...SHELLFISH])) notes.push("Cook fish to 63 °C (145 °F) or until it flakes easily. Discard shellfish that stay closed after cooking.");
  if (has(["egg"])) notes.push("For young children, pregnant people, older adults or anyone with a weakened immune system, cook eggs until whites and yolks are firm.");
  if (has(["rice"])) notes.push("Cool leftover rice quickly (within about an hour), keep it in the fridge and eat it within a day. Reheat until steaming hot.");
  if (/\bkidney beans?\b/i.test(all) && !/\b(canned|tinned|can)\b/i.test(all)) notes.push("Dried red kidney beans must be soaked and boiled hard for at least 10 minutes. Canned beans are already cooked.");
  if (has([...MEAT_FISH])) notes.push("Keep raw meat and fish away from ready-to-eat food, and wash hands, boards and knives after handling them.");
  if (/\bdeep[- ]?fr(y|ied|ying)\b/i.test(stepText)) notes.push("Never leave hot oil unattended. Keep a lid nearby and never put water on an oil fire.");
  notes.push("Refrigerate leftovers within 2 hours and eat them within 3 days.");
  return notes;
}

/* ───────────── Helpers ───────────── */

const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
const MARKETING = /\b(tested|kitchen[- ]tested|guaranteed|proven|chef[- ]approved|100% safe)\b/i;

function classify(name: string, ctx: GenerateContext): { kind: "have" | "staple" | "buy"; userName: string | null; quantity: string | null } {
  const user = ctx.ingredients.find((i) => sameIngredient(i.name, name));
  if (user) return { kind: "have", userName: user.name, quantity: user.quantity };
  const staple = findIn(ctx.staples, name);
  if (staple) return { kind: "staple", userName: staple, quantity: null };
  return { kind: "buy", userName: null, quantity: null };
}

/* ───────────── Ideas ───────────── */

export function validateIdeas(ai: AiIdeas, req: IdeasRequest, makeId: () => string): { ideas: GeneratedIdea[]; issues: string[] } {
  const issues: string[] = [];
  const ideas: GeneratedIdea[] = [];
  const seen = new Set(req.previousTitles.map(normalizeName));
  for (const raw of ai.ideas) {
    if (ideas.length >= 3) break;
    const title = clip(raw.title, 90);
    if (title.length < 3 || MARKETING.test(title)) {
      issues.push("idea with an unusable title dropped");
      continue;
    }
    if (seen.has(normalizeName(title))) {
      issues.push(`repeated idea “${title}” dropped`);
      continue;
    }
    const minutes = Math.round(raw.minutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
      issues.push(`“${title}” has an impossible time`);
      continue;
    }
    if (req.maxMinutes && minutes > Math.ceil(req.maxMinutes * 1.15)) {
      issues.push(`“${title}” is longer than ${req.maxMinutes} min`);
      continue;
    }
    const uses = new Set<string>();
    const staples = new Set<string>();
    const missing = new Set<string>();
    for (const name of [...raw.usesIngredients, ...raw.usesStaples, ...raw.needsToBuy]) {
      if (!name.trim()) continue;
      const c = classify(name, req);
      if (c.kind === "have") uses.add(c.userName!);
      else if (c.kind === "staple") staples.add(c.userName!);
      else if (!findIn([...missing], name)) missing.add(clip(name, 60));
    }
    if (uses.size === 0) {
      issues.push(`“${title}” doesn't use your ingredients`);
      continue;
    }
    const conflicts = findRestrictionConflicts([title, ...missing], req.diets, req.avoid);
    if (conflicts.length) {
      issues.push(`“${title}” dropped: ${conflicts[0]}`);
      continue;
    }
    seen.add(normalizeName(title));
    ideas.push({
      id: makeId(),
      title,
      description: clip(raw.description, 240) || title,
      minutes,
      difficulty: raw.difficulty,
      cuisine: clip(raw.cuisine, 40),
      uses: [...uses].slice(0, 40),
      missing: [...missing].slice(0, 20),
      staples: [...staples].slice(0, 20),
      highlight: MARKETING.test(raw.highlight) ? "" : clip(raw.highlight, 160),
    });
  }
  return { ideas, issues };
}

/* ───────────── Full recipe ───────────── */

export function validateRecipe(
  ai: AiRecipe,
  req: RecipeRequest,
  meta: { id: string; now: string },
): { recipe: GeneratedRecipe | null; issues: string[] } {
  const issues: string[] = [];
  const fail = (msg: string) => ({ recipe: null, issues: [...issues, msg] });

  const title = clip(ai.title, 90);
  if (title.length < 3 || MARKETING.test(title)) return fail("unusable title");

  const prep = Math.round(ai.prepMinutes);
  const cook = Math.round(ai.cookMinutes);
  if (![prep, cook].every((n) => Number.isFinite(n) && n >= 0 && n <= 600) || prep + cook < 1 || prep + cook > 600) return fail("impossible cooking time");
  const servings = Number.isFinite(ai.servings) && ai.servings >= 1 && ai.servings <= 12 ? Math.round(ai.servings) : req.servings;

  // Ingredients
  if (ai.ingredients.length < 2 || ai.ingredients.length > 30) return fail("wrong number of ingredients");
  const ingredients: GeneratedRecipe["ingredients"] = [];
  for (const raw of ai.ingredients) {
    const name = clip(raw.name, 80);
    if (!name) return fail("ingredient without a name");
    if (ingredients.some((i) => normalizeName(i.name) === normalizeName(name))) continue; // duplicate line
    let unit = normalizeUnit(raw.unit);
    if (!unit) return fail(`unknown unit “${raw.unit}” for ${name}`);
    let amount = raw.amount;
    if (unit === "to taste") amount = null;
    else if (amount === null) unit = "to taste"; // honest: no amount given
    else if (!Number.isFinite(amount) || amount <= 0 || amount > UNIT_MAX[unit]) return fail(`impossible amount for ${name}: ${amount} ${unit}`);
    if (amount !== null) amount = Math.round(amount * 100) / 100;
    const c = classify(name, req);
    if (raw.source !== c.kind) issues.push(`${name}: “${raw.source}” corrected to “${c.kind}”`);
    ingredients.push({ name, amount, unit, preparation: clip(raw.preparation, 120), source: c.kind, youHave: c.kind === "have" ? c.quantity : null });
  }
  if (ingredients.length < 2) return fail("too few distinct ingredients");
  if (!ingredients.some((i) => i.source === "have")) return fail("doesn't use your ingredients");

  const conflicts = findRestrictionConflicts([title, ...ingredients.map((i) => i.name)], req.diets, req.avoid);
  if (conflicts.length) return fail(`restriction conflict: ${conflicts[0]}`);

  // Steps – every reference must point at a listed ingredient, and the steps must actually use them.
  if (ai.steps.length < 2 || ai.steps.length > 20) return fail("wrong number of steps");
  const used = new Set<number>();
  let refs = 0;
  let badRefs = 0;
  const steps: GeneratedRecipe["steps"] = [];
  for (const s of ai.steps) {
    const text = clip(s.text, 600);
    if (text.length < 3) return fail("empty step");
    for (const ref of s.uses) {
      refs++;
      const idx = ingredients.findIndex((i) => sameIngredient(i.name, ref) || normalizeName(i.name) === normalizeName(ref));
      if (idx < 0) badRefs++;
      else used.add(idx);
    }
    const lower = ` ${normalizeName(text)} `;
    ingredients.forEach((ing, idx) => {
      const n = normalizeName(ing.name);
      if (n && lower.includes(` ${n} `)) used.add(idx);
    });
    const minutes = s.minutes !== null && Number.isFinite(s.minutes) && s.minutes >= 1 ? Math.min(600, Math.round(s.minutes)) : null;
    steps.push({ text, minutes });
  }
  if (refs > 0 && badRefs / refs > 0.3) return fail("steps refer to ingredients that aren't listed");
  if (used.size / ingredients.length < 0.6) return fail("steps don't use most of the ingredients");

  const quantityNotes = ingredients
    .filter((i) => i.source === "have" && i.youHave === null && i.amount !== null)
    .map((i) => `You didn't say how much ${i.name.toLowerCase()} you have. This recipe uses ${i.amount} ${i.unit}.`);

  const stepText = steps.map((s) => s.text).join(" ");
  const appSafety = safetyGuidance(ingredients.map((i) => i.name), stepText);
  const modelSafety = ai.safetyNotes
    .map((n) => clip(n, 300))
    .filter((n) => n.length > 10 && !MARKETING.test(n) && !appSafety.some((a) => a.slice(0, 40) === n.slice(0, 40)))
    .slice(0, 3);

  const substitutions = ai.substitutions
    .map((s) => ({ ingredient: clip(s.ingredient, 80), swap: clip(s.swap, 120), note: clip(s.note, 200) }))
    .filter((s) => s.ingredient && s.swap && findRestrictionConflicts([s.swap], req.diets, req.avoid).length === 0)
    .slice(0, 10);

  return {
    issues,
    recipe: {
      id: meta.id,
      kind: "ai",
      createdAt: meta.now,
      title,
      description: clip(ai.description, 400),
      servings,
      prepMinutes: prep,
      cookMinutes: cook,
      difficulty: ai.difficulty,
      cuisine: clip(ai.cuisine, 40),
      mode: req.mode,
      equipment: ai.equipment.map((e) => clip(e, 60)).filter(Boolean).slice(0, 15),
      ingredients,
      steps,
      substitutions,
      safety: [...appSafety, ...modelSafety].slice(0, 10),
      tips: ai.tips.map((t) => clip(t, 240)).filter((t) => t && !MARKETING.test(t)).slice(0, 6),
      quantityNotes: quantityNotes.slice(0, 20),
      videoQuery: clip(ai.videoSearch.replace(/[^\p{L}\p{N}\s&'-]/gu, " "), 80) || title,
      inspiration: req.inspiration,
      basedOn: req.ingredients.map((i) => i.name).slice(0, 40),
    },
  };
}
