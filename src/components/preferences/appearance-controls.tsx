"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useAccount } from "@/components/account/account-provider";
import { MODES, PALETTES } from "@/lib/theme/appearance";
import { appearanceStore, useAppearance } from "@/lib/theme/store";
import { cn } from "@/lib/utils/cn";

const MODE_META = { system: { label: "System", icon: Monitor }, light: { label: "Light", icon: Sun }, dark: { label: "Dark", icon: Moon } };

export function AppearanceControls() {
  const appearance = useAppearance();
  const { status } = useAccount();
  return (
    <section aria-labelledby="appearance-title" className="grid grid-cols-[minmax(0,1fr)] gap-5 border-b border-line pb-9 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-10">
      <div>
        <h2 id="appearance-title" className="font-display text-[1.375rem] leading-tight">Appearance</h2>
        <p className="mt-1 text-sm text-muted">{status === "signed-in" ? "Follows your account across devices." : "Saved on this device."}</p>
      </div>
      <div className="space-y-6">
        <fieldset>
          <legend className="label">Colour collection</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PALETTES.map((p) => {
              const on = appearance.palette === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => appearanceStore.set({ ...appearance, palette: p.value })}
                  className={cn("group overflow-hidden rounded-[0.75rem] border bg-paper text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0", on ? "border-accent" : "border-line hover:border-line-strong")}
                >
                  <span aria-hidden className="flex h-12">
                    <span className="flex-[3]" style={{ background: p.fill }} />
                    <span className="flex-1" style={{ background: p.tint }} />
                  </span>
                  <span className="flex items-center justify-between px-3 py-2 text-[0.8125rem] font-medium">
                    {p.name}
                    {on && <Check className="size-3.5 text-accent" aria-hidden strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Display mode</legend>
          <div className="inline-grid grid-cols-3 gap-0.5 rounded-[0.625rem] bg-ink/[0.06] p-0.5">
            {MODES.map((mode) => {
              const { label, icon: Icon } = MODE_META[mode];
              const on = appearance.mode === mode;
              return (
                <button key={mode} type="button" aria-pressed={on} onClick={() => appearanceStore.set({ ...appearance, mode })} className={cn("inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[0.5rem] px-3.5 text-[0.8125rem] font-medium transition-colors", on ? "bg-paper text-ink shadow-soft" : "text-muted hover:text-ink")}>
                  <Icon className="size-3.5" aria-hidden strokeWidth={1.9} /> {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
