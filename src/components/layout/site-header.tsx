import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { DesktopNav } from "./nav-links";

export function SiteHeader() {
  return (
    <header data-site-header className="sticky top-0 z-40 border-b border-line/70 bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Fridge Rescue – home" className="rounded-xl">
          <Logo />
        </Link>
        <DesktopNav />
        <Link href="/my-fridge" className={buttonClass("primary", "sm", "md:hidden")}>
          My Fridge
        </Link>
      </div>
    </header>
  );
}
