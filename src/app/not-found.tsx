import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-narrow flex flex-col items-start py-24 sm:py-32">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-4 text-[2.75rem] sm:text-[4rem]">This page has gone missing</h1>
      <p className="lede mt-5">Like that last yogurt at the back of the fridge. Let&apos;s get you somewhere useful.</p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/" className={buttonClass("primary", "md")}>Go home</Link>
        <Link href="/recipes" className={buttonClass("secondary", "md")}>Browse recipes</Link>
      </div>
    </div>
  );
}
