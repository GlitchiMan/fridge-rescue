import type { DietaryTag } from "@/types";
import { detectIngredients } from "@/lib/discover/detect";

/**
 * Deterministic understanding of a cooking question – no AI involved.
 * Everything it extracts maps onto the existing matching engine's filters.
 */
export interface AssistantQuery {
  /** Ingredients the user says they have (catalogue ids). */
  ingredients: string[];
  /** Ingredients to leave out ("without milk", "no onions"). */
  avoid: string[];
  maxMinutes: number | null;
  diets: DietaryTag[];
  noOven: boolean;
  fewIngredients: boolean;
  leftovers: boolean;
  highProtein: boolean;
  spicy: boolean;
  healthy: boolean;
  wantsVideos: boolean;
  wantsTrending: boolean;
  /** "What can I make" style – use the saved kitchen. */
  usesKitchen: boolean;
  /** Meal the user asked for, mapped to recipe categories. */
  meal: "breakfast" | "lunch" | "dinner" | "dessert" | "snack" | null;
  /** "three ideas" → 3. */
  count: number | null;
  /** "for my family", "for 4" → servings. */
  servings: number | null;
  surprise: boolean;
  /** "restaurant-quality", "impress", "special" – prefer more involved dishes. */
  special: boolean;
  /** The user named TikTok/Instagram – we can only search YouTube live. */
  mentionsSocial: boolean;
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

const NEGATION = /\b(?:without|no|not|don'?t have|do not have|out of|ran out of|skip|minus|allergic to|avoid)\s+(?:any\s+|an?\s+|the\s+)?([a-z][a-z\s-]{1,30}?)(?=[,.!?;]|\s+(?:and|but|in|for|that|which|please)\b|$)/gi; // "without milk or butter" stays one phrase

export function parseQuestion(raw: string): AssistantQuery {
  const text = raw.toLowerCase().slice(0, 500);

  const avoid = new Set<string>();
  let rest = text;
  for (const m of text.matchAll(NEGATION)) {
    const phrase = m[1]!.trim();
    if (/^(oven|time|idea|ideas|meat)$/.test(phrase)) continue;
    detectIngredients(phrase).forEach((id) => avoid.add(id));
    rest = rest.replace(m[0], " ");
  }

  let maxMinutes: number | null = null;
  const minutes = /(\d{1,3})\s*(?:-|\s)?(?:min|mins|minute|minutes)\b/.exec(text);
  const hours = /(\d)\s*(?:hour|hr)s?\b/.exec(text);
  if (minutes) maxMinutes = Math.min(240, Math.max(5, Number(minutes[1])));
  else if (hours) maxMinutes = Number(hours[1]) * 60;
  else if (/\b(quick|fast|speedy|in a hurry|hurry|weeknight)\b/.test(text)) maxMinutes = 20;

  const diets: DietaryTag[] = [];
  if (/\bvegan\b/.test(text)) diets.push("vegan");
  else if (/\b(vegetarian|veggie|meat[- ]free|no meat|meatless)\b/.test(text)) diets.push("vegetarian");
  if (/\b(dairy[- ]free|no dairy|lactose)\b/.test(text)) diets.push("dairy-free");
  if (/\b(gluten[- ]free|no gluten|coeliac|celiac)\b/.test(text)) diets.push("gluten-free");

  const ingredients = detectIngredients(rest).filter((id) => !avoid.has(id));

  const meal = /\bbreakfast|brunch\b/.test(text)
    ? "breakfast"
    : /\blunch\b/.test(text)
      ? "lunch"
      : /\b(dinner|supper|tonight)\b/.test(text)
        ? "dinner"
        : /\b(dessert|sweet|bake|baking)\b/.test(text)
          ? "dessert"
          : /\bsnack\b/.test(text)
            ? "snack"
            : null;
  const countMatch = /\b(\d|one|two|three|four|five|six)\s+(?:\w+\s+)?(ideas|options|recipes|meals|dinners|dishes|suggestions)\b/.exec(text);
  const count = countMatch ? Math.min(6, Number(countMatch[1]) || NUMBER_WORDS[countMatch[1]!] || 0) || null : null;
  const servingsMatch = /\bfor\s+(\d{1,2})\s*(?:people|of us|servings|persons)?\b/.exec(text);
  const servings = servingsMatch ? Math.min(12, Number(servingsMatch[1])) : /\bfamily\b/.test(text) ? 4 : null;

  return {
    meal,
    count,
    servings,
    surprise: /\b(surprise|random|anything|inspire|inspiration)\b/.test(text),
    special: /\b(restaurant|impress|fancy|special|date night|dinner party)\b/.test(text),
    mentionsSocial: /\b(tiktok|instagram|reel|reels)\b/.test(text),
    ingredients,
    avoid: Array.from(avoid),
    maxMinutes,
    diets,
    noOven: /\b(no|without( an?)?|don'?t have an?|haven'?t got an?)\s+oven\b/.test(text),
    fewIngredients: /\b(five|5|few|three|3|four|4)\s+ingredients?\b|\bfew ingredients\b/.test(text),
    leftovers: /\bleftover/.test(text),
    highProtein: /\b(high[- ]protein|protein)\b/.test(text),
    spicy: /\b(spicy|spice|chilli|chili|kick)\b|\bhot\b(?!\s+right now)/.test(text),
    healthy: /\b(healthy|light|fresh|lighter|veg[- ]packed|nutritious)\b/.test(text),
    wantsVideos: /\b(video|videos|watch|show me how|tutorial|youtube|tiktok|reel)\b/.test(text),
    wantsTrending: /\b(trending|popular|viral|right now|hot right now)\b/.test(text),
    usesKitchen: /\b(what can i (make|cook)|my (fridge|kitchen|ingredients|leftovers)|what i have|i have)\b/.test(text),
  };
}
