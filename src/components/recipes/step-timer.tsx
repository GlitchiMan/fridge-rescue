"use client";

import { BellRing, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio not available */
  }
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Countdown timer. Uses wall-clock time so it stays accurate if the tab is
 * throttled. Alerts (sound/vibration) only work while this page is open –
 * we say so rather than promising background notifications.
 */
export function StepTimer({ minutes, label, large = false }: { minutes: number; label: string; large?: boolean }) {
  const total = Math.round(minutes * 60);
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const endAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round(((endAt.current ?? Date.now()) - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        setDone(true);
        beep();
        navigator.vibrate?.([300, 150, 300]);
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
          try {
            new Notification("Fridge Rescue timer", { body: `${label}: time's up!` });
          } catch {
            /* ignore */
          }
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, label]);

  const start = () => {
    endAt.current = Date.now() + remaining * 1000;
    setDone(false);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setDone(false);
    setRemaining(total);
  };

  return (
    <div
      className={cn(
        "no-print inline-flex items-center gap-1 rounded-full border bg-white p-1 pl-3",
        done ? "border-coral bg-coral-soft" : running ? "border-forest" : "border-line-strong",
        large && "p-1.5 pl-4 text-lg",
      )}
      role="timer"
      aria-label={`${label} timer`}
    >
      {done ? <BellRing className="size-4 text-coral-ink" aria-hidden /> : <Timer className="size-4 text-forest" aria-hidden />}
      <span className={cn("min-w-[3.2rem] font-mono font-semibold tabular-nums", done && "text-coral-ink")} aria-live={done ? "assertive" : "off"}>
        {done ? "Time's up!" : fmt(remaining)}
      </span>
      {running ? (
        <button type="button" onClick={pause} aria-label="Pause timer" className="inline-flex size-9 items-center justify-center rounded-full bg-forest-50 text-forest hover:bg-forest-100">
          <Pause className="size-4" aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={start} aria-label={done ? "Restart timer" : "Start timer"} className="inline-flex size-9 items-center justify-center rounded-full bg-forest text-white hover:bg-forest-700" disabled={remaining === 0 && !done}>
          <Play className="size-4" aria-hidden />
        </button>
      )}
      {(remaining !== total || done) && (
        <button type="button" onClick={reset} aria-label="Reset timer" className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-forest-50">
          <RotateCcw className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
