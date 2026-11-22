"use client";

import { Check, ClipboardCopy, PackagePlus, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
import { useState } from "react";
import { buttonClass, iconButtonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { track } from "@/lib/analytics/events";
import { findIngredientByAlias } from "@/lib/matching/ingredient-search";
import { UNIT_OPTIONS, isUnit } from "@/lib/quantities/units";
import { formatShoppingItem, groupShoppingList, shoppingListToText } from "@/lib/shopping/merge";
import { cn } from "@/lib/utils/cn";
import type { ShoppingListItem, Unit } from "@/types";

export function ShoppingList() {
  const { data, hydrated } = useKitchen();
  const toast = useToast();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<Unit | "">("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShoppingListItem | null>(null);
  const [confirmMove, setConfirmMove] = useState(false);

  const list = data.shoppingList;
  const purchased = list.filter((i) => i.purchased);
  const groups = groupShoppingList(list);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Type an item to add.");
    let quantity: number | null = null;
    if (qty.trim()) {
      quantity = Number(qty.replace(",", "."));
      if (!Number.isFinite(quantity) || quantity <= 0) return setError("Amount must be greater than 0 (or leave it blank).");
    }
    const ing = findIngredientByAlias(trimmed);
    const finalUnit: Unit | null = quantity === null ? null : unit && isUnit(unit) ? unit : (ing?.defaultUnit ?? "pcs");
    kitchenStore.addToShoppingList([{ ingredientId: ing?.id ?? null, name: ing?.name ?? trimmed.slice(0, 120), quantity, unit: finalUnit }]);
    track({ name: "shopping_item_added", props: { count: 1 } });
    setName("");
    setQty("");
    setUnit("");
    setError(null);
  };

  const copy = async () => {
    const text = shoppingListToText(list);
    try {
      await navigator.clipboard.writeText(text);
      toast.show("Shopping list copied");
    } catch {
      toast.show("Couldn't access the clipboard in this browser.", { tone: "info" });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <form onSubmit={add} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1">
            <label htmlFor="shop-name" className="label">Add an item</label>
            <input id="shop-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. onions" maxLength={120} autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-56">
            <div>
              <label htmlFor="shop-qty" className="label">Amount</label>
              <input id="shop-qty" className="field" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="–" />
            </div>
            <div>
              <label htmlFor="shop-unit" className="label">Unit</label>
              <select id="shop-unit" className="field" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                <option value="">Auto</option>
                {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.value}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className={buttonClass("primary", "md")}><Plus className="size-4" aria-hidden /> Add</button>
        </form>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-coral-ink">{error}</p>}

        <div className="mt-6">
          {!hydrated ? (
            <Skeleton className="h-48" />
          ) : list.length === 0 ? (
            <EmptyState icon={ShoppingBasket} title="All stocked up! Your shopping list is empty.">
              Add items above, or add missing ingredients from any recipe with one tap.
            </EmptyState>
          ) : (
            <div className="space-y-6">
              {groups.map((g) => (
                <section key={g.category} aria-labelledby={`grp-${g.category}`}>
                  <h2 id={`grp-${g.category}`} className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-muted">{g.label}</h2>
                  <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
                    {g.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 px-2 py-1.5" data-testid="shopping-item">
                        <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 px-2">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={item.purchased}
                            onChange={() => kitchenStore.toggleShoppingPurchased(item.id)}
                          />
                          <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-orange", item.purchased ? "border-forest bg-forest text-white" : "border-line-strong bg-white")}>
                            {item.purchased && <Check className="size-4" />}
                          </span>
                          <span className={cn("text-[1.02rem]", item.purchased && "text-muted line-through")}>{formatShoppingItem(item)}</span>
                        </label>
                        <button type="button" className={cn(iconButtonClass, "text-xs font-semibold")} onClick={() => setEditing(item)} aria-label={`Edit amount for ${item.name}`}>
                          Edit
                        </button>
                        <button type="button" className={cn(iconButtonClass, "hover:bg-coral-soft hover:text-coral-ink")} aria-label={`Remove ${item.name}`} onClick={() => kitchenStore.removeShoppingItem(item.id)}>
                          <X className="size-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="card p-4">
          <p className="font-semibold">{hydrated ? `${list.length - purchased.length} to buy · ${purchased.length} in basket` : "…"}</p>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" className={buttonClass("secondary", "md")} onClick={copy} disabled={!list.length}>
              <ClipboardCopy className="size-4" aria-hidden /> Copy shopping list
            </button>
            <button type="button" className={buttonClass("secondary", "md")} onClick={() => setConfirmMove(true)} disabled={!purchased.some((p) => p.ingredientId)}>
              <PackagePlus className="size-4" aria-hidden /> Add purchased to My Fridge
            </button>
            <button
              type="button"
              className={buttonClass("danger", "md")}
              disabled={!purchased.length}
              onClick={() => {
                kitchenStore.clearPurchased();
                toast.show("Cleared purchased items");
              }}
            >
              <Trash2 className="size-4" aria-hidden /> Clear purchased
            </button>
          </div>
        </div>
        <p className="px-1 text-xs text-muted">Tip: tick items as you shop. Your list is saved in this browser, so it&apos;s there when you open the site on your phone at the store (same browser).</p>
      </aside>

      <Dialog
        open={confirmMove}
        onClose={() => setConfirmMove(false)}
        title="Add purchased items to My Fridge?"
        description="Recognised items you've ticked will be added (or combined with what you already have) and removed from this list."
        footer={
          <>
            <button type="button" className={buttonClass("ghost", "md")} onClick={() => setConfirmMove(false)}>Cancel</button>
            <button
              type="button"
              className={buttonClass("primary", "md")}
              onClick={() => {
                const n = kitchenStore.movePurchasedToInventory();
                setConfirmMove(false);
                toast.show(`Added ${n} item${n === 1 ? "" : "s"} to My Fridge`);
              }}
            >
              Add to My Fridge
            </button>
          </>
        }
      >
        <ul className="space-y-1 text-sm">
          {purchased.filter((p) => p.ingredientId).map((p) => <li key={p.id}>• {formatShoppingItem(p)}</li>)}
        </ul>
        {purchased.some((p) => !p.ingredientId) && <p className="mt-3 text-xs text-muted">Items we don&apos;t recognise stay on the list.</p>}
      </Dialog>

      <EditShoppingDialog item={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditShoppingDialog({ item, onClose }: { item: ShoppingListItem | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(item)} onClose={onClose} title={item ? `Edit ${item.name}` : "Edit"}>
      {item && <EditForm key={item.id} item={item} onClose={onClose} />}
    </Dialog>
  );
}

function EditForm({ item, onClose }: { item: ShoppingListItem; onClose: () => void }) {
  const [qty, setQty] = useState(item.quantity != null ? String(item.quantity) : "");
  const [unit, setUnit] = useState<Unit>(item.unit ?? "pcs");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let q: number | null = null;
        if (qty.trim()) {
          q = Number(qty.replace(",", "."));
          if (!Number.isFinite(q) || q <= 0) return setError("Amount must be greater than 0.");
        }
        kitchenStore.updateShoppingItem(item.id, { quantity: q, unit: q === null ? null : unit });
        onClose();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-qty" className="label">Amount</label>
          <input id="edit-qty" className="field" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Any amount" />
        </div>
        <div>
          <label htmlFor="edit-unit" className="label">Unit</label>
          <select id="edit-unit" className="field" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-coral-ink">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={buttonClass("ghost", "md")} onClick={onClose}>Cancel</button>
        <button type="submit" className={buttonClass("primary", "md")}>Save</button>
      </div>
    </form>
  );
}
