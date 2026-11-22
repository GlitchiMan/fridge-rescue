"use client";

import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Recipe } from "@/types";
import { StepTimer } from "./step-timer";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

export function CookingMode({ recipe, open, onClose, onFinish }: { recipe: Recipe; open: boolean; onClose: () => void; onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const [screenOn, setScreenOn] = useState(false);
  const total = recipe.instructions.length;
  const current = recipe.instructions[step]!;

  // Keep the screen awake while cooking, where the browser supports it.
  useEffect(() => {
    if (!open) return;
    let sentinel: WakeLockSentinelLike | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
    nav.wakeLock
      ?.request("screen")
      .then((s) => {
        sentinel = s;
        setScreenOn(true);
      })
      .catch(() => setScreenOn(false));
    return () => {
      sentinel?.release().catch(() => {});
      setScreenOn(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, total - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, total]);

  const last = step === total - 1;

  return (
    <Dialog open={open} onClose={onClose} title={recipe.title} description={`Step ${step + 1} of ${total}${screenOn ? " · screen stays on" : ""}`} size="full">
      <div className="flex min-h-[60dvh] flex-col">
        <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label="Cooking progress">
          <div className="h-full rounded-full bg-forest transition-[width]" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <div className="flex flex-1 flex-col justify-center py-8" aria-live="polite">
          <p className="eyebrow">Step {step + 1}</p>
          <p className="mt-3 font-display text-2xl leading-snug sm:text-3xl">{current.text}</p>
          {current.timerMinutes && (
            <div className="mt-6">
              <StepTimer key={step} minutes={current.timerMinutes} label={`Step ${step + 1}`} large />
              <p className="mt-2 text-xs text-muted">Timer alerts only sound while this page stays open.</p>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-line bg-cream pt-4">
          <button type="button" className={buttonClass("secondary", "lg")} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="size-5" aria-hidden /> Previous
          </button>
          {last ? (
            <button
              type="button"
              className={buttonClass("primary", "lg")}
              onClick={() => {
                onClose();
                setStep(0);
                onFinish();
              }}
            >
              <PartyPopper className="size-5" aria-hidden /> Finish
            </button>
          ) : (
            <button type="button" className={buttonClass("primary", "lg")} onClick={() => setStep((s) => Math.min(total - 1, s + 1))}>
              Next <ChevronRight className="size-5" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
