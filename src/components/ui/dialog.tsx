"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "full";
}

/**
 * Accessible modal built on the native <dialog> element: focus trapping,
 * Escape to close and inert background come from the browser.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && el.open) {
      el.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-hidden rounded-[1rem] border border-line bg-white p-0 text-ink shadow-lift backdrop:bg-ink/35 backdrop:backdrop-blur-[3px] open:animate-pop",
        size === "md" && "max-w-lg",
        size === "lg" && "max-w-2xl",
        size === "full" && "h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none bg-cream sm:h-[92dvh] sm:max-w-3xl sm:rounded-[1rem]",
      )}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
            <div>
              <h2 id={titleId} className="font-display text-[1.5rem] leading-tight tracking-[-0.02em]">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1.5 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-[0.5rem] text-muted hover:bg-ink/[0.05] hover:text-ink"
            >
              <X className="size-[1.1rem]" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
