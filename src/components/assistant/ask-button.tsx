"use client";

import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAssistant } from "./assistant-provider";

/** Subtle, recognisable entry point to the assistant. */
export function AskButton({ className, label = "Ask Fridge AI", compact = false }: { className?: string; label?: string; compact?: boolean }) {
  const assistant = useAssistant();
  return (
    <button
      type="button"
      onClick={() => assistant.open()}
      aria-label={compact ? label : undefined}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-[0.625rem] border border-line-strong bg-paper text-[0.875rem] font-medium text-ink transition-[border-color,transform] hover:border-forest active:scale-[0.97]",
        compact ? "size-9 justify-center" : "px-3",
        className,
      )}
    >
      <MessageSquareText className="size-4 text-accent" aria-hidden strokeWidth={1.9} />
      {!compact && label}
    </button>
  );
}
