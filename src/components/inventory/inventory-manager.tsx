"use client";

import { AlertTriangle, Clock, Pencil, Refrigerator, Snowflake, Trash2, UtensilsCrossed, Package, Archive } from "lucide-react";
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

const TABS: { value: "all" | StorageLocation; label: string; icon: typeof Refrigerator }[] = [
  { value: "all", label: "All items", icon: Archive },
  { value: "fridge", label: "Fridge", icon: Refrigerator },
  { value: "freezer", label: "Freezer", icon: Snowflake },
  { value: "pantry", label: "Pantry", icon: Package },
];

const FRESH_STYLE: Record<FreshnessStatus, string> = {
  "past-use-by": "bg-coral text-white",
  "use-soon": "bg-coral-soft text-coral-ink",
  "past-best-before": "bg-orange-soft text-orange-ink",
  "best-before-soon": "bg-orange-soft text-orange-ink",
  ok: "bg-surface text-muted",
  "no-date": "",
};

export function FreshnessBadge({ info }: { info: FreshnessInfo }) {
  if (info.status === "no-date") return null;
  const Icon = info.status === "ok" ? Clock : AlertTriangle;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", FRESH_STYLE[info.status])}>
      <Icon className="size-3" aria-hidden />
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
    <section aria-labelledby="kitchen-heading" className="card p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="kitchen-heading" className="text-2xl font-semibold">Your kitchen</h2>
          <p className="text-sm text-muted">{hydrated ? `${inventory.length} item${inventory.length === 1 ? "" : "s"} saved in this browser` : "Loading…"}</p>
        </div>
        {inventory.length > 0 && (
          <button type="button" className={buttonClass("danger", "sm")} onClick={() => setConfirmClear(true)}>
            <Trash2 className="size-4" aria-hidden /> Clear all
          </button>
        )}
      </div>

      <div className="mt-4">
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">One-tap add</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {quickIds.map((id) => {
              const ing = getIngredient(id)!;
              return (
                <li key={id}>
                  <button type="button" onClick={() => quickAdd(id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-cream px-3 text-sm font-semibold hover:border-forest hover:bg-forest-50">
                    <span className="size-2.5 rounded-full" style={{ background: ing.color }} aria-hidden />+ {ing.name.replace(/ \(.*\)/, "")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Storage location" className="flex gap-1 overflow-x-auto rounded-full bg-surface p-1">
          {TABS.map(({ value, label, icon: Icon }) => {
            const count = value === "all" ? inventory.length : inventory.filter((i) => i.location === value).length;
            return (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn("inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold", tab === value ? "bg-white text-forest shadow-soft" : "text-muted hover:text-ink")}
              >
                <Icon className="size-4" aria-hidden /> {label} <span className="text-xs opacity-70">{hydrated ? count : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <label htmlFor="inv-search" className="sr-only">Search your kitchen</label>
          <input id="inv-search" type="search" className="field min-h-10 flex-1 lg:w-48" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <label htmlFor="inv-sort" className="sr-only">Sort items</label>
          <select id="inv-sort" className="field min-h-10 w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
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
          <p className="rounded-xl bg-surface p-6 text-center text-muted">Nothing here matches. Try another tab or search.</p>
        ) : (
          grouped.map((g) => (
            <div key={g.key} className="mt-4 first:mt-0">
              {g.label && <h3 className="mb-1 font-sans text-xs font-bold uppercase tracking-wider text-muted">{g.label}</h3>}
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {g.rows.map(({ item, fresh }) => {
                  const ing = getIngredient(item.ingredientId);
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-3 py-2.5" data-testid="inventory-item">
                      <span className="size-3 shrink-0 rounded-full border border-ink/10" style={{ background: ing?.color }} aria-hidden />
                      <button type="button" onClick={() => setDialog({ ingredientId: item.ingredientId, item })} className="min-w-0 flex-1 text-left">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold">{item.displayName}</span>
                          <span className={cn("text-sm", item.quantity === null ? "italic text-muted" : "text-ink")} data-testid="inventory-qty">
                            {item.quantity === null ? "amount not set" : formatQuantity({ quantity: item.quantity, unit: item.unit }, ing)}
                          </span>
                          {item.isLeftover && <span className="inline-flex items-center gap-1 rounded-full bg-leaf-soft px-2 py-0.5 text-xs font-semibold text-forest-800"><UtensilsCrossed className="size-3" aria-hidden />Leftover</span>}
                          <FreshnessBadge info={fresh} />
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {LOCATION_LABELS[item.location]}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </span>
                      </button>
                      <button type="button" className={iconButtonClass} aria-label={`Edit ${item.displayName}`} onClick={() => setDialog({ ingredientId: item.ingredientId, item })}>
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button type="button" className={cn(iconButtonClass, "hover:bg-coral-soft hover:text-coral-ink")} aria-label={`Remove ${item.displayName}`} onClick={() => remove(item)}>
                        <Trash2 className="size-4" aria-hidden />
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
        <p className="mt-4 rounded-xl bg-coral-soft p-3 text-sm text-coral-ink">
          Some items are past the use-by date you entered. We don&apos;t suggest recipes with them. Follow the label – when in doubt, throw it out.
        </p>
      )}
      <p className="mt-4 text-xs text-muted">
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
              className={buttonClass("primary", "md", "bg-coral-ink hover:bg-coral-ink/90 shadow-none")}
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
