"use client";

import { Plus, Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { getIngredient } from "@/data/ingredients";
import { findIngredientByAlias, searchIngredients } from "@/lib/matching/ingredient-search";
import { cn } from "@/lib/utils/cn";

interface Props {
  selected: string[];
  onAdd: (ids: string[]) => void;
  onRemove?: (id: string) => void;
  label: string;
  placeholder?: string;
  hideLabel?: boolean;
  showChips?: boolean;
  size?: "md" | "lg";
  /** Exclude these ids from suggestions (e.g. already in fridge). */
  exclude?: string[];
  inputId?: string;
}

export function IngredientPicker({
  selected,
  onAdd,
  onRemove,
  label,
  placeholder = "Try eggs, tomatoes, rice...",
  hideLabel = false,
  showChips = true,
  size = "md",
  exclude = [],
  inputId,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [notFound, setNotFound] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const id = inputId ?? autoId;
  const listId = `${id}-list`;

  const excludeSet = useMemo(() => new Set([...selected, ...exclude]), [selected, exclude]);
  // Only search the last comma-separated fragment.
  const fragment = query.split(",").pop()?.trim() ?? "";
  const suggestions = useMemo(() => (fragment ? searchIngredients(fragment, 7, excludeSet) : []), [fragment, excludeSet]);
  const showList = open && suggestions.length > 0;

  const commit = (pickedId?: string) => {
    const parts = query.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
    const ids: string[] = [];
    const unknown: string[] = [];
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      if (isLast && pickedId) return;
      const found = findIngredientByAlias(part) ?? (isLast && suggestions[0] && suggestions[0].score >= 60 ? suggestions[0].ingredient : undefined);
      if (found) ids.push(found.id);
      else unknown.push(part);
    });
    if (pickedId) ids.push(pickedId);
    const fresh = Array.from(new Set(ids)).filter((x) => !selected.includes(x));
    if (fresh.length) onAdd(fresh);
    setNotFound(unknown);
    setQuery("");
    setActive(0);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <label htmlFor={id} className={cn("label", hideLabel && "sr-only")}>
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-line-strong bg-white pl-4 pr-1.5 shadow-soft transition-shadow focus-within:border-forest focus-within:shadow-[0_0_0_4px_rgb(36_92_69_/_0.15)]",
          size === "lg" ? "min-h-15" : "min-h-12",
        )}
      >
        <Search className="size-5 shrink-0 text-muted" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
            setNotFound([]);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (!query.trim()) return;
              commit(showList ? suggestions[active]?.ingredient.id : undefined);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Backspace" && !query && selected.length && onRemove) {
              onRemove(selected[selected.length - 1]!);
            } else if (e.key === "," && fragment && suggestions[0]) {
              // Typing a comma accepts the best suggestion.
              e.preventDefault();
              commit(suggestions[active]?.ingredient.id);
            }
          }}
          className={cn("min-w-0 flex-1 bg-transparent py-2 text-ink outline-none placeholder:text-muted/80", size === "lg" ? "text-lg" : "text-base")}
        />
        <button
          type="button"
          onClick={() => query.trim() && commit(showList ? suggestions[active]?.ingredient.id : undefined)}
          disabled={!query.trim()}
          aria-label="Add ingredient"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest transition-colors hover:bg-forest-100 disabled:opacity-40"
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Ingredient suggestions"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-lift"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.ingredient.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(s.ingredient.id);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5",
                i === active ? "bg-forest-50 text-forest-800" : "text-ink",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="size-3 rounded-full border border-ink/10" style={{ background: s.ingredient.color }} aria-hidden />
                <span className="font-semibold">{s.ingredient.name}</span>
              </span>
              {s.matchedAlias && <span className="truncate text-xs text-muted">matches “{s.matchedAlias}”</span>}
            </li>
          ))}
        </ul>
      )}

      {notFound.length > 0 && (
        <p className="mt-2 text-sm text-coral-ink" role="alert">
          We don&apos;t know {notFound.map((n) => `“${n}”`).join(", ")} yet – try a more common name.
        </p>
      )}

      {showChips && selected.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected ingredients">
          {selected.map((sid) => {
            const ing = getIngredient(sid);
            if (!ing) return null;
            return (
              <li key={sid} className="animate-pop">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-200 bg-forest-50 py-1 pl-3 pr-1 text-sm font-semibold text-forest-800">
                  <span className="size-2.5 rounded-full" style={{ background: ing.color }} aria-hidden />
                  {ing.name}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(sid)}
                      aria-label={`Remove ${ing.name}`}
                      className="inline-flex size-7 items-center justify-center rounded-full text-forest hover:bg-forest-100"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
