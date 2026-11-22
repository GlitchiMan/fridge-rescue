"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex max-w-xl flex-col items-center py-20 text-center">
      <h1 className="text-4xl font-semibold">Something went wrong.</h1>
      <p className="mt-3 text-muted">Please try again. Your kitchen data is safe in your browser.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className={buttonClass("primary", "md")}>Try again</button>
        <Link href="/" className={buttonClass("secondary", "md")}>Go home</Link>
      </div>
    </div>
  );
}
