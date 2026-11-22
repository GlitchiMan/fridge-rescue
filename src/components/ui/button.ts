import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,box-shadow,transform,color] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-forest text-white shadow-[0_2px_0_rgb(22_58_43)] hover:bg-forest-700",
  secondary: "bg-white text-forest border border-line-strong hover:border-forest hover:bg-forest-50",
  ghost: "text-forest hover:bg-forest-50",
  soft: "bg-forest-50 text-forest hover:bg-forest-100",
  danger: "bg-white text-coral-ink border border-coral/40 hover:bg-coral-soft",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 text-sm",
  md: "min-h-11 px-5 text-[0.95rem]",
  lg: "min-h-13 px-7 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string): string {
  return cn(base, variants[variant], sizes[size], extra);
}

export const iconButtonClass =
  "inline-flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-forest-50 hover:text-forest disabled:opacity-40";
