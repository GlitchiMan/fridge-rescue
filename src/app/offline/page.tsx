import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <div className="container-narrow flex flex-col items-start py-24 sm:py-32">
      <p className="eyebrow">No connection</p>
      <h1 className="mt-4 text-[2.75rem] sm:text-[4rem]">You&apos;re offline</h1>
      <p className="lede mt-5">This page isn&apos;t saved for offline use yet. Pages you&apos;ve visited before – and your kitchen data – are still available on this device.</p>
      <Link href="/my-fridge" className={buttonClass("primary", "md", "mt-8")}>Open My Fridge</Link>
    </div>
  );
}
