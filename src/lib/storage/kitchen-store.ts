import { getIngredient } from "@/data/ingredients";
import { applyInventoryDeduction, type DeductionLine } from "@/lib/matching/deduction";
import { convertCompatibleUnits } from "@/lib/quantities/units";
import { mergeIntoShoppingList, type ShoppingAddition } from "@/lib/shopping/merge";
import { createId } from "@/lib/utils/id";
import type {
  ConsentSettings,
  InventoryItem,
  MealPlanEntry,
  MealSlot,
  StorageLocation,
  StorageSchema,
  Unit,
  UserPreferences,
  Weekday,
} from "@/types";
import { LocalStorageRepository, type KitchenRepository } from "./repository";
import { createEmptyState } from "./schema";

export interface KitchenSnapshot {
  data: StorageSchema;
  /** false on the server and during the first client render. */
  hydrated: boolean;
  /** false when the browser blocks storage – data then lives only in memory. */
  persistent: boolean;
  issues: string[];
}

export interface NewInventoryInput {
  ingredientId: string;
  quantity: number | null;
  unit: Unit;
  location?: StorageLocation;
  useBy?: string;
  bestBefore?: string;
  notes?: string;
  isLeftover?: boolean;
}

type Listener = () => void;

const SERVER_SNAPSHOT: KitchenSnapshot = Object.freeze({
  data: createEmptyState(),
  hydrated: false,
  persistent: false,
  issues: [],
}) as KitchenSnapshot;

export class KitchenStore {
  private snapshot: KitchenSnapshot = SERVER_SNAPSHOT;
  private listeners = new Set<Listener>();
  private initialised = false;
  private unsubscribeExternal: (() => void) | null = null;

  constructor(private readonly repo: KitchenRepository) {}

  /* ── useSyncExternalStore plumbing ── */

  getSnapshot = (): KitchenSnapshot => {
    if (!this.initialised && typeof window !== "undefined") this.init();
    return this.snapshot;
  };

  getServerSnapshot = (): KitchenSnapshot => SERVER_SNAPSHOT;

  subscribe = (listener: Listener): (() => void) => {
    if (!this.initialised && typeof window !== "undefined") this.init();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private init() {
    this.initialised = true;
    this.reloadFromRepo();
    this.unsubscribeExternal = this.repo.onExternalChange(() => {
      this.reloadFromRepo();
      this.emit();
    });
  }

  private reloadFromRepo() {
    const persistent = this.repo.isAvailable();
    const loaded = persistent ? this.repo.load() : null;
    this.snapshot = {
      data: loaded?.state ?? createEmptyState(),
      hydrated: true,
      persistent,
      issues: loaded?.issues ?? [],
    };
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  private commit(updater: (data: StorageSchema) => StorageSchema) {
    if (!this.initialised) this.init();
    const data = updater(this.snapshot.data);
    if (data === this.snapshot.data) return;
    const saved = this.repo.save(data);
    this.snapshot = { ...this.snapshot, data, persistent: this.snapshot.persistent && saved };
    this.emit();
  }

  get data(): StorageSchema {
    return this.getSnapshot().data;
  }

  /* ── Inventory ── */

  findInventoryMatch(ingredientId: string): InventoryItem | undefined {
    return this.data.inventory.find((i) => i.ingredientId === ingredientId && !i.isLeftover);
  }

  addInventoryItem(input: NewInventoryInput): InventoryItem {
    const ing = getIngredient(input.ingredientId);
    const item: InventoryItem = {
      id: createId("inv"),
      ingredientId: input.ingredientId,
      displayName: ing?.name ?? input.ingredientId,
      quantity: input.quantity,
      unit: input.unit,
      location: input.location ?? ing?.defaultLocation ?? "fridge",
      useBy: input.useBy || undefined,
      bestBefore: input.bestBefore || undefined,
      notes: input.notes?.trim() || undefined,
      isLeftover: input.isLeftover || undefined,
      addedAt: new Date().toISOString(),
    };
    this.commit((d) => ({ ...d, inventory: [...d.inventory, item] }));
    return item;
  }

  /**
   * Combine a new amount into an existing item. Returns false when the units
   * aren't compatible (caller should then add a separate item or ask).
   */
  combineInventoryItem(existingId: string, quantity: number | null, unit: Unit, dates?: { useBy?: string; bestBefore?: string }): boolean {
    const existing = this.data.inventory.find((i) => i.id === existingId);
    if (!existing) return false;
    let newQuantity: number | null;
    if (existing.quantity === null || quantity === null) {
      newQuantity = existing.quantity ?? quantity;
      if (existing.quantity === null && quantity === null) newQuantity = null;
    } else {
      const converted = convertCompatibleUnits(quantity, unit, existing.unit);
      if (converted === null) return false;
      newQuantity = Math.round((existing.quantity + converted) * 1000) / 1000;
    }
    // Keep the EARLIEST date: the conservative choice.
    const earliest = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : a || b || undefined);
    this.updateInventoryItem(existingId, {
      quantity: newQuantity,
      unit: existing.quantity === null && quantity !== null ? unit : existing.unit,
      useBy: earliest(existing.useBy, dates?.useBy),
      bestBefore: earliest(existing.bestBefore, dates?.bestBefore),
    });
    return true;
  }

  /** Add several ingredients by id with unknown quantity, skipping duplicates. */
  quickAddIngredients(ingredientIds: string[]): { added: string[]; skipped: string[] } {
    const added: string[] = [];
    const skipped: string[] = [];
    const existing = new Set(this.data.inventory.map((i) => i.ingredientId));
    const items: InventoryItem[] = [];
    for (const id of ingredientIds) {
      const ing = getIngredient(id);
      if (!ing) continue;
      if (existing.has(id)) {
        skipped.push(id);
        continue;
      }
      existing.add(id);
      added.push(id);
      items.push({
        id: createId("inv"),
        ingredientId: id,
        displayName: ing.name,
        quantity: null,
        unit: ing.defaultUnit,
        location: ing.defaultLocation,
        addedAt: new Date().toISOString(),
      });
    }
    if (items.length) this.commit((d) => ({ ...d, inventory: [...d.inventory, ...items] }));
    return { added, skipped };
  }

  updateInventoryItem(id: string, patch: Partial<Omit<InventoryItem, "id" | "ingredientId" | "addedAt">>) {
    this.commit((d) => ({
      ...d,
      inventory: d.inventory.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        for (const k of ["useBy", "bestBefore", "notes"] as const) if (!next[k]) delete next[k];
        if (!next.isLeftover) delete next.isLeftover;
        return next;
      }),
    }));
  }

  removeInventoryItem(id: string): { item: InventoryItem; index: number } | null {
    const index = this.data.inventory.findIndex((i) => i.id === id);
    if (index < 0) return null;
    const item = this.data.inventory[index]!;
    this.commit((d) => ({ ...d, inventory: d.inventory.filter((i) => i.id !== id) }));
    return { item, index };
  }

  restoreInventoryItem(item: InventoryItem, index: number) {
    this.commit((d) => {
      if (d.inventory.some((i) => i.id === item.id)) return d;
      const inv = [...d.inventory];
      inv.splice(Math.min(index, inv.length), 0, item);
      return { ...d, inventory: inv };
    });
  }

  clearInventory(): InventoryItem[] {
    const previous = this.data.inventory;
    this.commit((d) => ({ ...d, inventory: [] }));
    return previous;
  }

  restoreInventory(items: InventoryItem[]) {
    this.commit((d) => ({ ...d, inventory: items }));
  }

  applyDeduction(lines: DeductionLine[]) {
    this.commit((d) => ({ ...d, inventory: applyInventoryDeduction(d.inventory, lines) }));
  }

  /* ── Favorites ── */

  toggleFavorite(recipeId: string): boolean {
    const isFav = this.data.favorites.includes(recipeId);
    this.commit((d) => ({
      ...d,
      favorites: isFav ? d.favorites.filter((f) => f !== recipeId) : [...d.favorites, recipeId],
    }));
    return !isFav;
  }

  /* ── Shopping list ── */

  addToShoppingList(additions: ShoppingAddition[]) {
    this.commit((d) => ({ ...d, shoppingList: mergeIntoShoppingList(d.shoppingList, additions) }));
  }

  toggleShoppingPurchased(id: string) {
    this.commit((d) => ({
      ...d,
      shoppingList: d.shoppingList.map((i) => (i.id === id ? { ...i, purchased: !i.purchased } : i)),
    }));
  }

  updateShoppingItem(id: string, patch: { quantity?: number | null; unit?: Unit | null; name?: string }) {
    this.commit((d) => ({ ...d, shoppingList: d.shoppingList.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }

  removeShoppingItem(id: string) {
    this.commit((d) => ({ ...d, shoppingList: d.shoppingList.filter((i) => i.id !== id) }));
  }

  clearPurchased() {
    this.commit((d) => ({ ...d, shoppingList: d.shoppingList.filter((i) => !i.purchased) }));
  }

  /** User-confirmed: move purchased items with a known ingredient into the fridge. */
  movePurchasedToInventory(): number {
    const purchased = this.data.shoppingList.filter((i) => i.purchased && i.ingredientId);
    let moved = 0;
    for (const s of purchased) {
      const ing = getIngredient(s.ingredientId!);
      if (!ing) continue;
      const unit = s.unit ?? ing.defaultUnit;
      const existing = this.findInventoryMatch(ing.id);
      if (!existing || !this.combineInventoryItem(existing.id, s.quantity, unit)) {
        this.addInventoryItem({ ingredientId: ing.id, quantity: s.quantity, unit });
      }
      moved += 1;
    }
    const movedIds = new Set(purchased.map((p) => p.id));
    this.commit((d) => ({ ...d, shoppingList: d.shoppingList.filter((i) => !movedIds.has(i.id)) }));
    return moved;
  }

  /* ── Meal plan ── */

  addMealPlanEntry(day: Weekday, slot: MealSlot, recipeId: string, servings: number): MealPlanEntry {
    const entry: MealPlanEntry = { id: createId("meal"), day, slot, recipeId, servings };
    this.commit((d) => ({ ...d, mealPlan: [...d.mealPlan, entry] }));
    return entry;
  }

  moveMealPlanEntry(id: string, day: Weekday, slot: MealSlot) {
    this.commit((d) => ({ ...d, mealPlan: d.mealPlan.map((m) => (m.id === id ? { ...m, day, slot } : m)) }));
  }

  removeMealPlanEntry(id: string) {
    this.commit((d) => ({ ...d, mealPlan: d.mealPlan.filter((m) => m.id !== id) }));
  }

  clearMealPlan() {
    this.commit((d) => ({ ...d, mealPlan: [] }));
  }

  /* ── History ── */

  recordCooked(recipeId: string, servings: number, deductedInventory: boolean) {
    const entry = { id: createId("cook"), recipeId, servings, deductedInventory, cookedAt: new Date().toISOString() };
    this.commit((d) => ({ ...d, history: [entry, ...d.history].slice(0, 2000) }));
  }

  removeHistoryEntry(id: string) {
    this.commit((d) => ({ ...d, history: d.history.filter((h) => h.id !== id) }));
  }

  /* ── Preferences & consent ── */

  updatePreferences(patch: Partial<UserPreferences>) {
    this.commit((d) => ({ ...d, preferences: { ...d.preferences, ...patch } }));
  }

  setConsent(patch: Omit<ConsentSettings, "decided" | "updatedAt">) {
    this.commit((d) => ({ ...d, consent: { ...patch, decided: true, updatedAt: new Date().toISOString() } }));
  }

  /* ── Whole-dataset operations ── */

  replaceAll(state: StorageSchema) {
    this.commit(() => state);
  }

  resetAll() {
    this.repo.clear();
    this.commit(() => createEmptyState());
  }

  /** Test helper. */
  dispose() {
    this.unsubscribeExternal?.();
    this.listeners.clear();
  }
}

export const kitchenStore = new KitchenStore(new LocalStorageRepository());
