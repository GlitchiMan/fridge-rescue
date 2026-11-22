import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[0.625rem] font-medium tracking-[-0.005em] transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-forest text-white hover:bg-forest-700 hover:shadow-[0_6px_16px_-6px_rgb(31_77_58_/_0.55)]",
  secondary: "bg-white text-ink border border-line-strong hover:border-ink/40",
  ghost: "text-ink-soft hover:bg-ink/[0.05] hover:text-ink",
  soft: "bg-ink/[0.05] text-ink hover:bg-ink/[0.09]",
  danger: "bg-white text-coral-ink border border-line-strong hover:border-coral/60 hover:bg-coral-soft",
  inverse: "bg-white text-ink hover:bg-cream",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-[0.8125rem]",
  md: "min-h-11 px-4 text-[0.9375rem]",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string): string {
  return cn(base, variants[variant], sizes[size], extra);
}

export const iconButtonClass =
  "inline-flex size-10 items-center justify-center rounded-[0.625rem] text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink disabled:opacity-40";
