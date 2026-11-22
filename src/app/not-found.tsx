import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex max-w-xl flex-col items-center py-20 text-center">
      <p className="font-display text-7xl font-semibold text-forest-200">404</p>
      <h1 className="mt-4 text-4xl font-semibold">This page has gone missing</h1>
      <p className="mt-3 text-muted">Like that last yogurt at the back of the fridge. Let&apos;s get you somewhere useful.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonClass("primary", "md")}>Go home</Link>
        <Link href="/recipes" className={buttonClass("secondary", "md")}>Browse recipes</Link>
      </div>
    </div>
  );
}
