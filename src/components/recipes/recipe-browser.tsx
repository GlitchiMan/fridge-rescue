"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { getIngredient } from "@/data/ingredients";
import { useKitchen } from "@/hooks/use-kitchen";
import { calculateRecipeMatch, checkRecipeAgainstPreferences, compareMatches, createMatchContext } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import { photoFirst } from "@/lib/images";
import { normalizeIngredientName } from "@/lib/matching/ingredient-search";
import { DIETARY_LABELS } from "@/lib/recipes/dietary";
import { cn } from "@/lib/utils/cn";
import { DIETARY_TAGS, DIFFICULTIES, EQUIPMENT, RECIPE_CATEGORIES, type RecipeMatch, type RecipeSummary } from "@/types";
import { Search, SearchX } from "lucide-react";
import { RecipeCard } from "./recipe-card";
import { recipeGridClass } from "./recipe-grid";

const CATEGORY_LABELS: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack", dessert: "Dessert", soup: "Soup",
  salad: "Salad", "one-pot": "One-pot", pasta: "Pasta", rice: "Rice dishes", vegetarian: "Vegetarian",
  budget: "Budget", quick: "Quick", leftovers: "Leftovers",
};
const EQUIPMENT_LABELS: Record<string, string> = {
  stovetop: "Stovetop", oven: "Oven", microwave: "Microwave", "air-fryer": "Air fryer", blender: "Blender", toaster: "Toaster",
};

export function RecipeBrowser({ recipes }: { recipes: RecipeSummary[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data, hydrated } = useKitchen();
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get("q") ?? "";
  const time = Number(params.get("time") ?? 0) || 0;
  const difficulty = params.get("difficulty") ?? "";
  const category = params.get("category") ?? "";
  const diet = params.get("diet") ?? "";
  const equipment = params.get("equipment") ?? "";
  const sort = params.get("sort") ?? "relevance";
  const canMakeOnly = params.get("canMake") === "1";
  const useSoonOnly = params.get("useSoon") === "1";
  const few = params.get("few") === "1";
  const noOven = params.get("noOven") === "1";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const hasInventory = hydrated && data.inventory.length > 0;
  const matches = useMemo(() => {
    if (!hasInventory) return new Map<string, RecipeMatch>();
    const ctx = createMatchContext(data.inventory, data.preferences, todayIso());
    const opts = { maxMinutes: data.preferences.maxMinutes, favorites: new Set(data.favorites) };
    return new Map(recipes.map((r) => [r.id, calculateRecipeMatch(r, ctx, opts)]));
  }, [hasInventory, data.inventory, data.preferences, data.favorites, recipes]);

  const filtered = useMemo(() => {
    const needle = normalizeIngredientName(q);
    let list = recipes.filter((r) => {
      if (needle) {
        const inTitle = normalizeIngredientName(r.title).includes(needle);
        const inIngredients = r.ingredients.some((ri) => {
          const ing = getIngredient(ri.ingredientId);
          return ing && [ing.name, ...ing.aliases].some((n) => normalizeIngredientName(n).includes(needle));
        });
        if (!inTitle && !inIngredients) return false;
      }
      if (time && r.totalMinutes > time) return false;
      if (difficulty && r.difficulty !== difficulty) return false;
      if (category && !r.categories.includes(category as RecipeSummary["categories"][number])) return false;
      if (diet && !r.dietaryTags.includes(diet as RecipeSummary["dietaryTags"][number])) return false;
      if (equipment && !r.equipment.includes(equipment as RecipeSummary["equipment"][number])) return false;
      if (noOven && r.equipment.includes("oven")) return false;
      if (few && r.ingredients.filter((i) => !i.optional && !i.toTaste).length > 5) return false;
      const m = matches.get(r.id);
      if (canMakeOnly && !(m && (m.readiness === "ready" || m.readiness === "check-quantities"))) return false;
      if (useSoonOnly && !(m && m.usesSoon.length > 0)) return false;
      return true;
    });
    const lookup = new Map(recipes.map((r) => [r.id, r]));
    if (sort === "time") list = [...list].sort((a, b) => a.totalMinutes - b.totalMinutes || a.title.localeCompare(b.title));
    else if (sort === "az") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (matches.size) {
      list = [...list].sort((a, b) => compareMatches(matches.get(a.id)!, matches.get(b.id)!, lookup));
    } else {
      // Default browsing order: photographed recipes lead.
      list = photoFirst(list);
    }
    return list;
  }, [recipes, q, time, difficulty, category, diet, equipment, noOven, few, canMakeOnly, useSoonOnly, sort, matches]);

  const activeCount = [time, difficulty, category, diet, equipment, canMakeOnly, useSoonOnly, few, noOven].filter(Boolean).length;
  const prefsHidden = hydrated
    ? filtered.filter((r) => !checkRecipeAgainstPreferences(r, data.preferences).allowed).length
    : 0;

  const select = (label: string, key: string, value: string, options: { value: string; label: string }[]) => (
    <div>
      <label htmlFor={`f-${key}`} className="label">
        {label}
      </label>
      <select id={`f-${key}`} className="field" value={value} onChange={(e) => setParam(key, e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  const toggle = (label: string, key: string, on: boolean, disabled = false, hint?: string) => (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      title={hint}
      onClick={() => setParam(key, on ? null : "1")}
      className={cn(
        "inline-flex min-h-9 items-center rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium transition-colors disabled:opacity-45",
        on ? "border-forest bg-forest text-white" : "border-line-strong bg-paper text-ink-soft hover:border-ink/40 hover:text-ink",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes by name or ingredient
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[1.1rem] -translate-y-1/2 text-muted" aria-hidden strokeWidth={1.75} />
          <input
            id="recipe-search"
            type="search"
            className="field min-h-12 pl-11 text-[1rem]"
            placeholder="Search by recipe or ingredient, e.g. chickpeas"
            defaultValue={q}
            onChange={(e) => setParam("q", e.target.value)}
          />
        </div>
        <button
          type="button"
          className={buttonClass("secondary", "md", "sm:hidden")}
          aria-expanded={showFilters}
          aria-controls="recipe-filters"
          onClick={() => setShowFilters((s) => !s)}
        >
          <SlidersHorizontal className="size-4" aria-hidden /> Filters{activeCount ? ` (${activeCount})` : ""}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {toggle("Only recipes I can make", "canMake", canMakeOnly, !hasInventory, hasInventory ? undefined : "Add ingredients to My Fridge first")}
        {toggle("Use my expiring ingredients", "useSoon", useSoonOnly, !hasInventory)}
        {toggle("5 ingredients or fewer", "few", few)}
        {toggle("No oven", "noOven", noOven)}
      </div>

      <div id="recipe-filters" className={cn("mt-5 grid gap-3 border-y border-line py-5 sm:grid sm:grid-cols-3 lg:grid-cols-6", !showFilters && "hidden")}>
        {select("Time", "time", String(time || ""), [
          { value: "", label: "Any time" },
          { value: "15", label: "Under 15 minutes" },
          { value: "30", label: "Under 30 minutes" },
          { value: "45", label: "Under 45 minutes" },
        ])}
        {select("Difficulty", "difficulty", difficulty, [{ value: "", label: "Any" }, ...DIFFICULTIES.map((d) => ({ value: d, label: d[0]!.toUpperCase() + d.slice(1) }))])}
        {select("Category", "category", category, [{ value: "", label: "All" }, ...RECIPE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))])}
        {select("Diet", "diet", diet, [{ value: "", label: "Any" }, ...DIETARY_TAGS.map((d) => ({ value: d, label: DIETARY_LABELS[d] }))])}
        {select("Equipment", "equipment", equipment, [{ value: "", label: "Any" }, ...EQUIPMENT.map((e) => ({ value: e, label: `Uses ${EQUIPMENT_LABELS[e]?.toLowerCase()}` }))])}
        {select("Sort by", "sort", sort, [
          { value: "relevance", label: hasInventory ? "Best match" : "Relevance" },
          { value: "time", label: "Quickest first" },
          { value: "az", label: "A–Z" },
        ])}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm tabular-nums text-muted" aria-live="polite">
          {filtered.length} recipe{filtered.length === 1 ? "" : "s"}
          {hasInventory ? " · matched against your fridge" : ""}
        </p>
        {activeCount > 0 || q ? (
          <button type="button" className="link inline-flex items-center gap-1 text-sm" onClick={() => router.replace(pathname, { scroll: false })}>
            <X className="size-4" aria-hidden /> Clear filters
          </button>
        ) : null}
      </div>
      {diet && (
        <p className="mt-3 rounded-[0.625rem] bg-orange-soft px-4 py-3 text-sm text-orange-ink">
          Diet labels are worked out from the ingredients we list. Brands differ, so always check packaging – especially for allergies, and be aware of cross-contact.
        </p>
      )}
      {prefsHidden > 0 && (
        <p className="mt-2 text-sm text-muted">
          {prefsHidden} of these don&apos;t fit your saved preferences (they&apos;re still shown here when browsing).
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={SearchX} title="We couldn't find a close match yet.">
            Try adding more ingredients or relaxing your filters.
          </EmptyState>
        </div>
      ) : (
        <ul className={cn("mt-8", recipeGridClass())}>
          {filtered.map((r) => (
            <li key={r.id}>
              <RecipeCard recipe={r} match={matches.get(r.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
