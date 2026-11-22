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
    title: "Ideas",
    links: [
      { href: "/ideas", label: "Cooking guides" },
      { href: "/ideas/what-to-make-with-eggs-and-potatoes", label: "Eggs & potatoes" },
      { href: "/ideas/easy-meals-with-leftover-rice", label: "Leftover rice" },
      { href: "/ideas/budget-student-dinners", label: "Student dinners" },
    ],
  },
  {
    title: "Fridge Rescue",
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
    <footer data-site-footer className="mt-20 border-t border-line bg-cream-deep pb-24 pt-12 md:pb-12">
      <div className="container-page">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">{SITE_SECONDARY_TAGLINE}</p>
            <p className="mt-3 max-w-xs text-xs text-muted">
              Your kitchen data stays in this browser. No account needed.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-sans text-sm font-bold text-ink">{col.title}</h2>
              <ul className="mt-3 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block py-1 text-sm text-muted hover:text-forest hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-10 border-t border-line pt-6 text-xs text-muted">
          © {new Date().getFullYear()} Fridge Rescue. Recipes and illustrations are original. Always use your own judgement about food safety.
        </p>
      </div>
    </footer>
  );
}
