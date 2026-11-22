import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <div className="container-page flex max-w-xl flex-col items-center py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-forest-50 text-forest"><WifiOff className="size-8" aria-hidden /></span>
      <h1 className="mt-6 text-4xl font-semibold">You&apos;re offline</h1>
      <p className="mt-3 text-muted">This page isn&apos;t saved for offline use yet. Pages you&apos;ve visited before – and your kitchen data – are still available on this device.</p>
      <Link href="/my-fridge" className={buttonClass("primary", "md", "mt-6")}>Open My Fridge</Link>
    </div>
  );
}
