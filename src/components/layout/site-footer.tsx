import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SITE_SECONDARY_TAGLINE } from "@/lib/seo/site";

const COLUMNS = [
  {
    title: "Cook",
    links: [
      { href: "/my-fridge", label: "My Fridge" },
      { href: "/recipes", label: "All recipes" },
      { href: "/meal-planner", label: "Meal planner" },
      { href: "/shopping-list", label: "Shopping list" },
      { href: "/saved", label: "Saved recipes" },
    ],
  },
  {
    title: "Guides",
    links: [
      { href: "/ideas", label: "All guides" },
      { href: "/ideas/what-to-make-with-eggs-and-potatoes", label: "Eggs & potatoes" },
      { href: "/ideas/easy-meals-with-leftover-rice", label: "Leftover rice" },
      { href: "/ideas/budget-student-dinners", label: "Student dinners" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/preferences", label: "Preferences & data" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookie-settings", label: "Cookie settings" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer data-site-footer className="mt-24 border-t border-line pb-28 pt-14 md:pb-14">
      <div className="container-page">
        <div className="grid gap-12 md:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs font-display text-xl leading-snug text-ink">{SITE_SECONDARY_TAGLINE}</p>
            <p className="mt-3 max-w-xs text-sm text-muted">Your kitchen data stays in this browser. No account needed.</p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">{col.title}</h2>
              <ul className="mt-4 space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block py-1 text-sm text-ink-soft transition-colors hover:text-forest">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Fridge Rescue. All recipes are original.</p>
          <p>Always use your own judgement about food safety.</p>
        </div>
      </div>
    </footer>
  );
}
