"use client";

import { AlertTriangle, Clock, Pencil, Refrigerator, Trash2, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { IngredientPicker } from "@/components/ingredients/ingredient-picker";
import { buttonClass, iconButtonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { CATEGORY_LABELS, QUICK_ADD_IDS, getIngredient } from "@/data/ingredients";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { track } from "@/lib/analytics/events";
import { getFreshness, todayIso, type FreshnessInfo } from "@/lib/matching/freshness";
import { normalizeIngredientName } from "@/lib/matching/ingredient-search";
import { formatQuantity } from "@/lib/quantities/units";
import { cn } from "@/lib/utils/cn";
import { INGREDIENT_CATEGORIES, type FreshnessStatus, type InventoryItem, type StorageLocation } from "@/types";
import { ItemDialog, LOCATION_LABELS, type ItemFormValues } from "./item-dialog";

const TABS: { value: "all" | StorageLocation; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "pantry", label: "Pantry" },
];

const FRESH_STYLE: Record<FreshnessStatus, string> = {
  "past-use-by": "bg-coral text-white",
  "use-soon": "bg-coral-soft text-coral-ink",
  "past-best-before": "bg-orange-soft text-orange-ink",
  "best-before-soon": "bg-orange-soft text-orange-ink",
  ok: "bg-cream-deep text-muted",
  "no-date": "",
};

export function FreshnessBadge({ info }: { info: FreshnessInfo }) {
  if (info.status === "no-date") return null;
  const Icon = info.status === "ok" ? Clock : AlertTriangle;
  return (
    <span className={cn("tag", FRESH_STYLE[info.status])}>
      <Icon className="size-3" aria-hidden strokeWidth={2} />
      {info.label}
    </span>
  );
}

type SortKey = "category" | "expiry" | "name" | "recent";

export function InventoryManager() {
  const { data, hydrated, persistent } = useKitchen();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("category");
  const [dialog, setDialog] = useState<{ ingredientId: string; item?: InventoryItem | null; existing?: InventoryItem | null } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const today = todayIso();

  const inventory = data.inventory;
  const filtered = useMemo(() => {
    const needle = normalizeIngredientName(query);
    return inventory
      .filter((i) => tab === "all" || i.location === tab)
      .filter((i) => !needle || normalizeIngredientName(i.displayName).includes(needle) || (i.notes && normalizeIngredientName(i.notes).includes(needle)));
  }, [inventory, tab, query]);

  const sorted = useMemo(() => {
    const withF = filtered.map((item) => ({ item, fresh: getFreshness(item, today) }));
    const dayKey = (f: FreshnessInfo) => (f.days === null ? Number.POSITIVE_INFINITY : f.days);
    if (sort === "expiry") withF.sort((a, b) => dayKey(a.fresh) - dayKey(b.fresh) || a.item.displayName.localeCompare(b.item.displayName));
    else if (sort === "recent") withF.sort((a, b) => b.item.addedAt.localeCompare(a.item.addedAt));
    else withF.sort((a, b) => a.item.displayName.localeCompare(b.item.displayName));
    return withF;
  }, [filtered, sort, today]);

  const grouped = useMemo(() => {
    if (sort !== "category") return [{ key: "all", label: "", rows: sorted }];
    return INGREDIENT_CATEGORIES.map((c) => ({
      key: c,
      label: CATEGORY_LABELS[c],
      rows: sorted.filter((r) => (getIngredient(r.item.ingredientId)?.category ?? "other") === c),
    })).filter((g) => g.rows.length);
  }, [sorted, sort]);

  const openAdd = (ingredientId: string) => {
    setDialog({ ingredientId, existing: kitchenStore.findInventoryMatch(ingredientId) ?? null });
  };

  const handleSubmit = (v: ItemFormValues, mode: "new" | "combine" | "update") => {
    if (!dialog) return;
    const name = getIngredient(dialog.ingredientId)?.name ?? "Item";
    if (mode === "update" && dialog.item) {
      kitchenStore.updateInventoryItem(dialog.item.id, v);
      toast.show(`Updated ${dialog.item.displayName}`);
    } else if (mode === "combine" && dialog.existing && kitchenStore.combineInventoryItem(dialog.existing.id, v.quantity, v.unit, v)) {
      toast.show(`Combined with your existing ${name.toLowerCase()}`);
    } else {
      kitchenStore.addInventoryItem({ ingredientId: dialog.ingredientId, ...v });
      track({ name: "ingredient_added", props: { source: "fridge" } });
      toast.show(`Added ${name} to your kitchen`);
    }
    setDialog(null);
  };

  const remove = (item: InventoryItem) => {
    const removed = kitchenStore.removeInventoryItem(item.id);
    if (removed) {
      toast.show(`Removed ${item.displayName}`, { action: { label: "Undo", onClick: () => kitchenStore.restoreInventoryItem(removed.item, removed.index) } });
    }
  };

  const quickAdd = (id: string) => {
    const { added } = kitchenStore.quickAddIngredients([id]);
    const name = getIngredient(id)?.name ?? id;
    if (added.length) {
      track({ name: "ingredient_added", props: { source: "quick-add" } });
      toast.show(`Added ${name}. Tap it to add an amount or date.`);
    } else toast.show(`${name} is already in your kitchen`, { tone: "info" });
  };

  const existingIds = useMemo(() => inventory.map((i) => i.ingredientId), [inventory]);
  const quickIds = QUICK_ADD_IDS.filter((id) => !existingIds.includes(id));

  return (
    <section aria-labelledby="kitchen-heading" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="kitchen-heading" className="font-display text-[1.625rem] leading-tight">Your kitchen</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">{hydrated ? `${inventory.length} item${inventory.length === 1 ? "" : "s"} saved in this browser` : "Loading…"}</p>
        </div>
        {inventory.length > 0 && (
          <button type="button" className={buttonClass("ghost", "sm", "text-muted hover:text-coral-ink")} onClick={() => setConfirmClear(true)}>
            <Trash2 className="size-3.5" aria-hidden strokeWidth={1.75} /> Clear all
          </button>
        )}
      </div>

      <div className="mt-5">
        <IngredientPicker
          label="Add an ingredient"
          placeholder="Add an ingredient, e.g. spinach"
          selected={[]}
          showChips={false}
          onAdd={(ids) => {
            if (ids.length === 1) openAdd(ids[0]!);
            else {
              const { added, skipped } = kitchenStore.quickAddIngredients(ids);
              toast.show(`Added ${added.length} item${added.length === 1 ? "" : "s"}${skipped.length ? `, ${skipped.length} already here` : ""}`);
            }
          }}
          inputId="fridge-add"
        />
      </div>

      {quickIds.length > 0 && (
        <div className="mt-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">One-tap add</p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {quickIds.map((id) => {
              const ing = getIngredient(id)!;
              return (
                <li key={id}>
                  <button type="button" onClick={() => quickAdd(id)} className="inline-flex min-h-8 items-center rounded-[0.5rem] border border-line px-2.5 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:bg-cream hover:text-ink">
                    + {ing.name.replace(/ \(.*\)/, "")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
        <div role="tablist" aria-label="Storage location" className="grid grid-cols-4 gap-0.5 rounded-[0.625rem] bg-ink/[0.05] p-0.5">
          {TABS.map(({ value, label }) => {
            const count = value === "all" ? inventory.length : inventory.filter((i) => i.location === value).length;
            return (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[0.5rem] px-2 text-[0.8125rem] font-medium transition-colors",
                  tab === value ? "bg-white text-ink shadow-soft" : "text-muted hover:text-ink",
                )}
              >
                {label} <span className="tabular-nums text-faint">{hydrated ? count : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <label htmlFor="inv-search" className="sr-only">Search your kitchen</label>
          <input id="inv-search" type="search" className="field min-h-10 min-w-0 flex-1 text-sm" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <label htmlFor="inv-sort" className="sr-only">Sort items</label>
          <select id="inv-sort" className="field min-h-10 w-auto text-sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="category">By category</option>
            <option value="expiry">By date (soonest)</option>
            <option value="name">A–Z</option>
            <option value="recent">Recently added</option>
          </select>
        </div>
      </div>

      <div className="mt-4" role="tabpanel" aria-label={TABS.find((t) => t.value === tab)?.label}>
        {!hydrated ? (
          <div className="space-y-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : inventory.length === 0 ? (
          <EmptyState icon={Refrigerator} title="Your fridge is looking a little empty.">
            Add your first ingredient to discover what you can make.
          </EmptyState>
        ) : sorted.length === 0 ? (
          <p className="rounded-[0.625rem] bg-cream px-4 py-6 text-center text-sm text-muted">Nothing here matches. Try another tab or search.</p>
        ) : (
          grouped.map((g) => (
            <div key={g.key} className="mt-5 first:mt-0">
              {g.label && <h3 className="mb-1.5 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">{g.label}</h3>}
              <ul className="divide-y divide-line border-y border-line">
                {g.rows.map(({ item, fresh }) => {
                  const ing = getIngredient(item.ingredientId);
                  return (
                    <li key={item.id} className="group/row flex items-center gap-2 py-2.5" data-testid="inventory-item">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: ing?.color }} aria-hidden />
                      <button type="button" onClick={() => setDialog({ ingredientId: item.ingredientId, item })} className="min-w-0 flex-1 pl-1 text-left">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-[0.9375rem] font-medium">{item.displayName}</span>
                          <span className={cn("text-[0.8125rem] tabular-nums", item.quantity === null ? "italic text-faint" : "text-muted")} data-testid="inventory-qty">
                            {item.quantity === null ? "amount not set" : formatQuantity({ quantity: item.quantity, unit: item.unit }, ing)}
                          </span>
                        </span>
                        {(item.isLeftover || fresh.status !== "no-date" || item.location !== ing?.defaultLocation || item.notes) && (
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                            {item.isLeftover && <span className="tag bg-forest-50 text-forest"><UtensilsCrossed className="size-3" aria-hidden />Leftover</span>}
                            <FreshnessBadge info={fresh} />
                            <span>
                              {LOCATION_LABELS[item.location]}
                              {item.notes ? ` · ${item.notes}` : ""}
                            </span>
                          </span>
                        )}
                      </button>
                      <button type="button" className={cn(iconButtonClass, "size-9")} aria-label={`Edit ${item.displayName}`} onClick={() => setDialog({ ingredientId: item.ingredientId, item })}>
                        <Pencil className="size-3.5" aria-hidden strokeWidth={1.75} />
                      </button>
                      <button type="button" className={cn(iconButtonClass, "size-9 hover:bg-coral-soft hover:text-coral-ink")} aria-label={`Remove ${item.displayName}`} onClick={() => remove(item)}>
                        <Trash2 className="size-3.5" aria-hidden strokeWidth={1.75} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {hydrated && inventory.some((i) => getFreshness(i, today).status === "past-use-by") && (
        <p className="mt-4 rounded-[0.625rem] bg-coral-soft px-4 py-3 text-sm text-coral-ink">
          Some items are past the use-by date you entered. We don&apos;t suggest recipes with them. Follow the label – when in doubt, throw it out.
        </p>
      )}
      <p className="mt-5 text-xs leading-relaxed text-muted">
        {persistent || !hydrated
          ? "Your kitchen is saved in this browser only. Clearing browser data will remove it – use Export in Preferences to keep a backup."
          : "This browser is blocking storage, so changes will be lost when you close the page."}
      </p>

      <ItemDialog open={Boolean(dialog)} onClose={() => setDialog(null)} ingredientId={dialog?.ingredientId ?? null} item={dialog?.item} existing={dialog?.existing} onSubmit={handleSubmit} />

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear your whole kitchen?"
        description="This removes every item from My Fridge. Your saved recipes, plan and shopping list stay."
        footer={
          <>
            <button type="button" className={buttonClass("ghost", "md")} onClick={() => setConfirmClear(false)}>Cancel</button>
            <button
              type="button"
              className={buttonClass("primary", "md", "bg-coral-ink hover:bg-coral-ink/90")}
              onClick={() => {
                const prev = kitchenStore.clearInventory();
                setConfirmClear(false);
                toast.show("Kitchen cleared", { action: { label: "Undo", onClick: () => kitchenStore.restoreInventory(prev) } });
              }}
            >
              Clear everything
            </button>
          </>
        }
      >
        <p className="text-muted">You can undo this for a few seconds afterwards.</p>
      </Dialog>
    </section>
  );
}
