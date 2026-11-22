import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const PRIMARY = [
  { href: "/recipes", label: "Recipes" },
  { href: "/my-fridge", label: "My Fridge" },
  { href: "/meal-planner", label: "Meal planner" },
  { href: "/shopping-list", label: "Shopping list" },
  { href: "/ideas", label: "Guides" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookie-settings", label: "Cookies" },
  { href: "/preferences", label: "Your data" },
];

export function SiteFooter() {
  return (
    <footer data-site-footer className="mt-20 border-t border-line pb-28 pt-10 md:pb-10">
      <div className="container-page">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden text-sm text-muted lg:inline">Cook with what you have.</span>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-6">
              {PRIMARY.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block py-1.5 text-sm text-ink-soft transition-colors hover:text-forest">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Fridge Rescue · Your kitchen data stays in this browser.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Legal">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
