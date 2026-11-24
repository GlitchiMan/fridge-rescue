"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useKitchen } from "@/hooks/use-kitchen";
import { useAccount } from "./account-provider";

const KEY = "fridge-rescue:invite-dismissed";
const listeners = new Set<() => void>();
const readDismissed = () => {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * A quiet invitation for guests who have something worth saving. It stays
 * hidden on production builds until real accounts are configured.
 */
export function AccountInvite({ variant }: { variant: "home" | "fridge" }) {
  const { configured, status } = useAccount();
  const { data, hydrated } = useKitchen();
  const dismissed = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    readDismissed,
    () => true,
  );
  if (!configured && process.env.NODE_ENV === "production") return null;
  if (!hydrated || status !== "guest" || dismissed) return null;

  const saved = data.inventory.length + data.favorites.length + data.mealPlan.length;
  if (variant === "fridge" && saved < 3) return null;
  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  };

  if (variant === "fridge") {
    return (
      <aside aria-label="Save your kitchen" className="mt-6 flex animate-fade-up items-center gap-3 rounded-[0.875rem] border border-line bg-paper py-3 pl-4 pr-2">
        <p className="min-w-0 flex-1 text-sm text-ink-soft">
          <span className="font-medium text-ink">Keep this kitchen safe.</span> <span className="hidden sm:inline">A free account saves it across your devices.</span>
        </p>
        <Link href="/signup" className="inline-flex min-h-9 shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline">Save it <ArrowRight className="size-3.5" aria-hidden /></Link>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="inline-flex size-9 shrink-0 items-center justify-center rounded-[0.5rem] text-muted hover:bg-ink/[0.05]"><X className="size-4" aria-hidden /></button>
      </aside>
    );
  }

  return (
    <section aria-labelledby="invite" className="container-page reveal pt-16 sm:pt-24">
      <div className="flex flex-col gap-6 border-y border-line py-9 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow text-champagne-ink">Always free</p>
          <h2 id="invite" className="mt-2 text-[2rem] leading-tight sm:text-[2.5rem]">Keep your kitchen with you.</h2>
          <p className="mt-2 max-w-lg text-muted">Save ingredients, recipes and meal plans on every device. Or just keep cooking as a guest.</p>
        </div>
        <Link href="/signup" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-[0.625rem] bg-forest px-6 font-medium text-white transition-[background-color,transform] hover:bg-forest-700 active:scale-[0.97] md:self-auto">
          Create free account <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
