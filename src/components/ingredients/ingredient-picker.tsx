"use client";

import { Plus, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  /** Called when Enter is pressed with an empty input (e.g. "search now"). */
  onEnterEmpty?: () => void;
  /** Lets a parent commit whatever is still typed (returns the new ids). */
  actionRef?: React.MutableRefObject<{ commit: () => string[] } | null>;
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
  onEnterEmpty,
  actionRef,
}: Props) {
  const [query, setQuery] = useState("");
  const [leaving, setLeaving] = useState<string | null>(null);
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

  /** Animate a chip out, then remove it. */
  const removeChip = (sid: string) => {
    if (!onRemove || leaving) return;
    setLeaving(sid);
    setTimeout(() => {
      onRemove(sid);
      setLeaving(null);
    }, 150);
  };

  const commit = (pickedId?: string): string[] => {
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
    return fresh;
  };

  // Expose "commit what's typed" to the parent (e.g. the Find recipes button).
  useEffect(() => {
    if (!actionRef) return;
    actionRef.current = { commit: () => (query.trim() ? commit(showList ? suggestions[active]?.ingredient.id : undefined) : []) };
  });

  return (
    <div className="relative">
      <label htmlFor={id} className={cn("label", size === "lg" && "mb-2.5 text-[0.875rem]", hideLabel && "sr-only")}>
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2.5 border border-line-strong bg-white pr-1.5 transition-[border-color,box-shadow] hover:border-[#BDB7A9] focus-within:border-forest focus-within:shadow-[0_0_0_3px_rgb(31_77_58_/_0.14)]",
          size === "lg" ? "min-h-[3.75rem] rounded-[0.875rem] pl-4" : "min-h-12 rounded-[0.625rem] pl-3.5",
        )}
      >
        <Search className={cn("shrink-0 text-muted", size === "lg" ? "size-5" : "size-[1.1rem]")} aria-hidden strokeWidth={1.75} />
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
              if (!query.trim()) {
                onEnterEmpty?.();
                return;
              }
              commit(showList ? suggestions[active]?.ingredient.id : undefined);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Backspace" && !query && selected.length && onRemove) {
              removeChip(selected[selected.length - 1]!);
            } else if (e.key === "," && fragment && suggestions[0]) {
              // Typing a comma accepts the best suggestion.
              e.preventDefault();
              commit(suggestions[active]?.ingredient.id);
            }
          }}
          className={cn("min-w-0 flex-1 bg-transparent py-2 text-ink outline-none placeholder:text-faint", size === "lg" ? "text-[1.0625rem]" : "text-base")}
        />
        <button
          type="button"
          onClick={() => query.trim() && commit(showList ? suggestions[active]?.ingredient.id : undefined)}
          disabled={!query.trim()}
          aria-label="Add ingredient"
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[0.5rem] text-[0.8125rem] font-medium transition-colors disabled:text-faint",
            query.trim() ? "bg-ink text-white hover:bg-ink-soft" : "bg-transparent",
            size === "lg" ? "h-11 px-3.5" : "h-9 px-2.5",
          )}
        >
          <Plus className="size-4" aria-hidden strokeWidth={2} />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Ingredient suggestions"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 animate-pop overflow-auto rounded-[0.75rem] border border-line bg-white p-1 shadow-lift"
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
                "flex cursor-pointer items-center justify-between gap-3 rounded-[0.5rem] px-3 py-2.5 text-[0.9375rem]",
                i === active ? "bg-cream-deep text-ink" : "text-ink-soft",
              )}
            >
              <span className="flex items-center gap-3">
                <span className="size-2 rounded-full" style={{ background: s.ingredient.color }} aria-hidden />
                <span className="font-medium text-ink">{s.ingredient.name}</span>
              </span>
              {s.matchedAlias ? (
                <span className="truncate text-xs text-muted">matches “{s.matchedAlias}”</span>
              ) : (
                i === active && <kbd className="hidden font-sans text-[0.6875rem] text-muted sm:inline">Enter</kbd>
              )}
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
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Selected ingredients">
          {selected.map((sid) => {
            const ing = getIngredient(sid);
            if (!ing) return null;
            return (
              <li key={sid} className={leaving === sid ? "animate-chip-out" : "animate-chip-in"}>
                <span className="inline-flex min-h-8 items-center gap-2 rounded-[0.5rem] bg-forest py-0.5 pl-2.5 pr-0.5 text-[0.8125rem] font-medium text-white">
                  {ing.name}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => removeChip(sid)}
                      aria-label={`Remove ${ing.name}`}
                      className="inline-flex size-7 items-center justify-center rounded-[0.375rem] text-white/75 transition-colors hover:bg-white/15 hover:text-white"
                    >
                      <X className="size-3.5" aria-hidden strokeWidth={2} />
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
