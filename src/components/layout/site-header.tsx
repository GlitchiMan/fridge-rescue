import Link from "next/link";
import { AccountLink } from "@/components/account/account-link";
import { AskButton } from "@/components/assistant/ask-button";
import { Logo } from "@/components/brand/logo";
import { DesktopNav, HeaderFridgeLink } from "./nav-links";

export function SiteHeader() {
  return (
    <header data-site-header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md supports-[backdrop-filter]:bg-cream/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:gap-6">
        <Link href="/" aria-label="Fridge Rescue – home" className="shrink-0 rounded-lg">
          <Logo />
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-2">
          <span className="hidden lg:block">
            <AskButton />
          </span>
          <span className="lg:hidden">
            <AskButton compact />
          </span>
          <AccountLink />
          {/* Phones reach My Fridge from the bottom navigation. */}
          <span className="hidden md:block">
            <HeaderFridgeLink />
          </span>
        </div>
      </div>
    </header>
  );
}
