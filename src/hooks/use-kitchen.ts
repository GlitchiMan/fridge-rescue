"use client";

import { useSyncExternalStore } from "react";
import { kitchenStore, type KitchenSnapshot } from "@/lib/storage/kitchen-store";

/**
 * Subscribe to the local kitchen data. On the server and during hydration this
 * returns an empty, `hydrated: false` snapshot, so markup always matches and
 * components can show a skeleton until the browser data is ready.
 */
export function useKitchen(): KitchenSnapshot {
  return useSyncExternalStore(kitchenStore.subscribe, kitchenStore.getSnapshot, kitchenStore.getServerSnapshot);
}

export { kitchenStore };
