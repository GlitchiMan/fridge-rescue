"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getIngredient } from "@/data/ingredients";
import { isIsoDate } from "@/lib/matching/freshness";
import { UNIT_OPTIONS, areUnitsCompatible, formatQuantity, isUnit } from "@/lib/quantities/units";
import { STORAGE_LOCATIONS, type InventoryItem, type StorageLocation, type Unit } from "@/types";

export const LOCATION_LABELS: Record<StorageLocation, string> = { fridge: "Fridge", freezer: "Freezer", pantry: "Pantry", other: "Other" };

export interface ItemFormValues {
  quantity: number | null;
  unit: Unit;
  location: StorageLocation;
  useBy?: string;
  bestBefore?: string;
  notes?: string;
  isLeftover?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  ingredientId: string | null;
  /** When editing an existing item. */
  item?: InventoryItem | null;
  /** Existing item with the same ingredient (for add mode). */
  existing?: InventoryItem | null;
  onSubmit: (values: ItemFormValues, mode: "new" | "combine" | "update") => void;
}

export function ItemDialog({ open, onClose, ingredientId, item, existing, onSubmit }: Props) {
  const ing = ingredientId ? getIngredient(ingredientId) : undefined;
  return (
    <Dialog open={open} onClose={onClose} title={item ? `Edit ${item.displayName}` : `Add ${ing?.name ?? "ingredient"}`} description="Only the name is required – leave the amount blank if you're not sure.">
      {open && ing && (
        <ItemForm
          key={`${ingredientId}-${item?.id ?? "new"}`}
          ingredientId={ing.id}
          item={item ?? null}
          existing={existing ?? null}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

function ItemForm({
  ingredientId,
  item,
  existing,
  onCancel,
  onSubmit,
}: {
  ingredientId: string;
  item: InventoryItem | null;
  existing: InventoryItem | null;
  onCancel: () => void;
  onSubmit: Props["onSubmit"];
}) {
  const ing = getIngredient(ingredientId)!;
  const [quantity, setQuantity] = useState(item?.quantity != null ? String(item.quantity) : "");
  const [unit, setUnit] = useState<Unit>(item?.unit ?? ing.defaultUnit);
  const [location, setLocation] = useState<StorageLocation>(item?.location ?? ing.defaultLocation);
  const [useBy, setUseBy] = useState(item?.useBy ?? "");
  const [bestBefore, setBestBefore] = useState(item?.bestBefore ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [isLeftover, setIsLeftover] = useState(Boolean(item?.isLeftover));
  const [error, setError] = useState<string | null>(null);

  const unitOptions = UNIT_OPTIONS.some((o) => o.value === unit) ? UNIT_OPTIONS : [...UNIT_OPTIONS, { value: unit, label: unit }];

  const validate = (): ItemFormValues | null => {
    let q: number | null = null;
    if (quantity.trim() !== "") {
      q = Number(quantity.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0 || q > 100000) {
        setError("Enter an amount greater than 0, or leave it blank if you're not sure.");
        return null;
      }
    }
    if (useBy && !isIsoDate(useBy)) return setError("Use-by date isn't valid."), null;
    if (bestBefore && !isIsoDate(bestBefore)) return setError("Best-before date isn't valid."), null;
    if (!isUnit(unit)) return setError("Choose a unit."), null;
    setError(null);
    return { quantity: q, unit, location, useBy: useBy || undefined, bestBefore: bestBefore || undefined, notes: notes.trim().slice(0, 500) || undefined, isLeftover };
  };

  const submit = (mode: "new" | "combine" | "update") => {
    const v = validate();
    if (v) onSubmit(v, mode);
  };

  const canCombine = existing && (existing.quantity === null || quantity.trim() === "" || areUnitsCompatible(existing.unit, unit));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(item ? "update" : existing ? (canCombine ? "combine" : "new") : "new");
      }}
      noValidate
    >
      {existing && !item && (
        <div className="mb-5 rounded-[0.625rem] bg-orange-soft px-4 py-3 text-sm text-orange-ink">
          You already have <strong>{existing.displayName}</strong> ({formatQuantity({ quantity: existing.quantity, unit: existing.unit }, ing)}).{" "}
          {canCombine ? "We'll combine the amounts, or you can add it as a separate item." : "The units differ, so it'll be added as a separate item."}
        </div>
      )}
      <div className="grid grid-cols-[1fr_1.2fr] gap-3">
        <div>
          <label htmlFor="item-qty" className="label">
            Amount <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="item-qty" className="field" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Not sure" aria-describedby={error ? "item-error" : undefined} />
        </div>
        <div>
          <label htmlFor="item-unit" className="label">Unit</label>
          <select id="item-unit" className="field" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {unitOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="label">Stored in</legend>
        <div className="grid grid-cols-4 gap-0.5 rounded-[0.625rem] bg-ink/[0.05] p-0.5">
          {STORAGE_LOCATIONS.map((l) => (
            <label key={l} className={`flex min-h-10 cursor-pointer items-center justify-center rounded-[0.5rem] text-[0.8125rem] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${location === l ? "bg-paper text-ink shadow-soft" : "text-muted hover:text-ink"}`}>
              <input type="radio" name="location" value={l} checked={location === l} onChange={() => setLocation(l)} className="sr-only" />
              {LOCATION_LABELS[l]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="item-useby" className="label">Use-by date</label>
          <input id="item-useby" type="date" className="field" value={useBy} onChange={(e) => setUseBy(e.target.value)} />
        </div>
        <div>
          <label htmlFor="item-bb" className="label">Best-before date</label>
          <input id="item-bb" type="date" className="field" value={bestBefore} onChange={(e) => setBestBefore(e.target.value)} />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-muted">Copy dates from the label. Use-by is about safety; best-before is about quality. We never guess dates.</p>

      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-[0.625rem] border border-line p-3.5 hover:border-line-strong">
        <input type="checkbox" className="size-[1.1rem] accent-forest" checked={isLeftover} onChange={(e) => setIsLeftover(e.target.checked)} />
        <span>
          <span className="text-[0.9375rem] font-medium">This is a leftover</span>
          <span className="block text-xs text-muted">e.g. cooked rice or roast chicken. Cool leftovers quickly and use them soon.</span>
        </span>
      </label>

      <div className="mt-4">
        <label htmlFor="item-notes" className="label">Notes <span className="font-normal text-muted">(optional)</span></label>
        <input id="item-notes" className="field" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. opened on Monday" />
      </div>

      {error && <p id="item-error" role="alert" className="mt-3 text-sm font-semibold text-coral-ink">{error}</p>}

      <div className="-mx-6 mt-6 flex flex-wrap justify-end gap-2 border-t border-line px-6 pt-4">
        <button type="button" className={buttonClass("ghost", "md")} onClick={onCancel}>Cancel</button>
        {existing && !item && canCombine && (
          <button type="button" className={buttonClass("secondary", "md")} onClick={() => submit("new")}>Add separately</button>
        )}
        <button type="submit" className={buttonClass("primary", "md")}>
          {item ? "Save changes" : existing && canCombine ? "Combine amounts" : "Add to my kitchen"}
        </button>
      </div>
    </form>
  );
}
