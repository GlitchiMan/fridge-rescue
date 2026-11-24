"use client";

import { Download, RotateCcw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { IngredientPicker } from "@/components/ingredients/ingredient-picker";
import { StaplesToggle } from "@/components/ingredients/staples-toggle";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { getIngredient } from "@/data/ingredients";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { DIETARY_LABELS } from "@/lib/recipes/dietary";
import { createBackup, parseBackupJson } from "@/lib/storage/schema";
import { cn } from "@/lib/utils/cn";
import { DIETARY_TAGS, EQUIPMENT, type StorageSchema } from "@/types";

const EQUIPMENT_LABELS: Record<string, string> = { stovetop: "Stovetop", oven: "Oven", microwave: "Microwave", "air-fryer": "Air fryer", blender: "Blender", toaster: "Toaster" };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("inline-flex min-h-9 items-center rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium transition-colors", on ? "border-forest bg-forest text-white" : "border-line-strong bg-paper text-ink-soft hover:border-ink/40 hover:text-ink")}>
      {children}
    </button>
  );
}

export function PreferencesForm() {
  const { data, hydrated, persistent } = useKitchen();
  const toast = useToast();
  const prefs = data.preferences;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ state: StorageSchema; issues: string[] } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const toggleIn = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const exportData = () => {
    const blob = new Blob([createBackup(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fridge-rescue-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.show("Backup downloaded");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) return toast.show("That file is too large to be a Fridge Rescue backup.", { tone: "info" });
    const text = await file.text();
    const res = parseBackupJson(text);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) return toast.show(res.issues[0] ?? "Couldn't read that file.", { tone: "info" });
    setPendingImport({ state: res.state, issues: res.issues });
  };

  if (!hydrated) return <p className="text-muted">Loading your preferences…</p>;

  return (
    <div className="divide-y divide-line">
      <section className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 py-9 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-10 md:[&>h2]:row-span-3" aria-labelledby="p-cooking">
        <h2 id="p-cooking" className="font-display text-[1.375rem] leading-tight">Cooking</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-time" className="label">Preferred maximum cooking time</label>
            <select id="p-time" className="field" value={prefs.maxMinutes ?? ""} onChange={(e) => kitchenStore.updatePreferences({ maxMinutes: e.target.value ? Number(e.target.value) : null })}>
              <option value="">No limit</option>
              {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="p-serv" className="label">Usual number of servings (meal planner)</label>
            <select id="p-serv" className="field" value={prefs.servings} onChange={(e) => kitchenStore.updatePreferences({ servings: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 py-9 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-10 md:[&>h2]:row-span-3" aria-labelledby="p-staples">
        <h2 id="p-staples" className="font-display text-[1.375rem] leading-tight">Pantry staples</h2>
        <StaplesToggle />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 py-9 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-10 md:[&>h2]:row-span-3" aria-labelledby="p-diet">
        <h2 id="p-diet" className="font-display text-[1.375rem] leading-tight">Diet</h2>
        <p className="mt-1 text-sm text-muted">Recipes that don&apos;t fit are hidden from recommendations. Labels are worked out from our ingredient data – always check packaging.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DIETARY_TAGS.map((d) => (
            <Chip key={d} on={prefs.diets.includes(d)} onClick={() => kitchenStore.updatePreferences({ diets: toggleIn(prefs.diets, d) })}>{DIETARY_LABELS[d]}</Chip>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 py-9 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-10 md:[&>h2]:row-span-3" aria-labelledby="p-excl">
        <h2 id="p-excl" className="font-display text-[1.375rem] leading-tight">Ingredients to avoid</h2>
        <p className="mt-1 text-sm text-muted">
          Recipes that need these are hidden, and we never suggest them as substitutes. This helps with dislikes and allergies, but it can&apos;t guarantee a recipe is allergen-free – always check labels and cross-contact.
        </p>
        <div className="mt-3">
          <IngredientPicker
            label="Add an ingredient to avoid"
            hideLabel
            placeholder="e.g. mushrooms"
            selected={prefs.excludedIngredients}
            onAdd={(ids) => kitchenStore.updatePreferences({ excludedIngredients: Array.from(new Set([...prefs.excludedIngredients, ...ids])) })}
            onRemove={(id) => kitchenStore.updatePreferences({ excludedIngredients: prefs.excludedIngredients.filter((x) => x !== id) })}
            inputId="exclude-input"
          />
        </div>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 py-9 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-10 md:[&>h2]:row-span-3" aria-labelledby="p-equip">
        <h2 id="p-equip" className="font-display text-[1.375rem] leading-tight">Kitchen equipment</h2>
        <p className="mt-1 text-sm text-muted">Leave all unselected to see every recipe. Select what you have to hide recipes needing anything else.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EQUIPMENT.map((e) => (
            <Chip key={e} on={prefs.equipment.includes(e)} onClick={() => kitchenStore.updatePreferences({ equipment: toggleIn(prefs.equipment, e) })}>{EQUIPMENT_LABELS[e]}</Chip>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 py-9 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-10 md:[&>h2]:row-span-3" aria-labelledby="p-data">
        <h2 id="p-data" className="font-display text-[1.375rem] leading-tight">Your data</h2>
        <p className="mt-1 text-sm text-muted">
          Everything is stored only in this browser ({persistent ? "saved" : "storage is blocked – changes won't be kept"}). Clearing your browser data removes it. Export a backup to move it to another device or keep it safe.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={buttonClass("secondary", "md")} onClick={exportData}><Download className="size-4" aria-hidden /> Export my data</button>
          <button type="button" className={buttonClass("secondary", "md")} onClick={() => fileRef.current?.click()}><Upload className="size-4" aria-hidden /> Import my data</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose backup file" onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" className={buttonClass("danger", "md")} onClick={() => setConfirmReset(true)}><RotateCcw className="size-4" aria-hidden /> Delete all my data</button>
        </div>
      </section>

      <Dialog
        open={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        title="Replace your data with this backup?"
        description="Your current kitchen, lists, plan and preferences in this browser will be replaced."
        footer={
          <>
            <button type="button" className={buttonClass("ghost", "md")} onClick={() => setPendingImport(null)}>Cancel</button>
            <button type="button" className={buttonClass("primary", "md")} onClick={() => { kitchenStore.replaceAll(pendingImport!.state); setPendingImport(null); toast.show("Backup imported"); }}>Import</button>
          </>
        }
      >
        {pendingImport && (
          <div className="text-sm">
            <p>The backup contains {pendingImport.state.inventory.length} kitchen items, {pendingImport.state.favorites.length} favourites, {pendingImport.state.shoppingList.length} shopping items and {pendingImport.state.mealPlan.length} planned meals.</p>
            {pendingImport.issues.length > 0 && (
              <ul className="mt-3 rounded-xl bg-orange-soft p-3 text-orange-ink">
                {pendingImport.issues.map((i) => <li key={i}>• {i}</li>)}
              </ul>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Delete all your Fridge Rescue data?"
        description="This permanently removes your kitchen, favourites, lists, plan, history and preferences from this browser. It can't be undone."
        footer={
          <>
            <button type="button" className={buttonClass("ghost", "md")} onClick={() => setConfirmReset(false)}>Cancel</button>
            <button type="button" className={buttonClass("primary", "md", "bg-coral-ink hover:bg-coral-ink/90 shadow-none")} onClick={() => { kitchenStore.resetAll(); setConfirmReset(false); toast.show("All data deleted"); }}>
              <X className="size-4" aria-hidden /> Delete everything
            </button>
          </>
        }
      >
        <p className="text-muted">Tip: export a backup first if you might want it later.</p>
      </Dialog>

      {prefs.excludedIngredients.some((id) => !getIngredient(id)) && <p className="text-sm text-muted">Some excluded ingredients are no longer recognised.</p>}
    </div>
  );
}
