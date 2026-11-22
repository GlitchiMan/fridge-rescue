"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-narrow flex flex-col items-start py-24 sm:py-32">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 text-[2.75rem] sm:text-[4rem]">Something went wrong.</h1>
      <p className="lede mt-5">Please try again. Your kitchen data is safe in your browser.</p>
      <div className="mt-8 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className={buttonClass("primary", "md")}>Try again</button>
        <Link href="/" className={buttonClass("secondary", "md")}>Go home</Link>
      </div>
    </div>
  );
}
