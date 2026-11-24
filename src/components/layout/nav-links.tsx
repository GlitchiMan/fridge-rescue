"use client";

import { BookOpen, CalendarDays, Compass, Refrigerator, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKitchen } from "@/hooks/use-kitchen";
import { cn } from "@/lib/utils/cn";

const DESKTOP = [
  { href: "/discover", label: "Discover" },
  { href: "/recipes", label: "Recipes" },
  { href: "/meal-planner", label: "Meal Planner" },
  { href: "/shopping-list", label: "Shopping List" },
  { href: "/saved", label: "Saved" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();
  const { data, hydrated } = useKitchen();
  const toBuy = data.shoppingList.filter((i) => !i.purchased).length;
  return (
    <nav aria-label="Main" className="hidden flex-1 md:block">
      <ul className="flex items-center gap-0.5">
        {DESKTOP.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[0.875rem] font-medium transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {l.label}
                {l.href === "/shopping-list" && hydrated && toBuy > 0 && (
                  <span className="min-w-5 rounded-[5px] bg-ink/[0.07] px-1 text-center text-[0.6875rem] font-semibold tabular-nums text-ink" aria-label={`${toBuy} items to buy`}>
                    {toBuy}
                  </span>
                )}
                {active && <span aria-hidden className="absolute inset-x-3 -bottom-[13px] h-px bg-ink" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Primary destination in the header: the user's own kitchen. */
export function HeaderFridgeLink() {
  const pathname = usePathname();
  const { data, hydrated } = useKitchen();
  const count = data.inventory.length;
  const active = isActive(pathname, "/my-fridge");
  return (
    <Link
      href="/my-fridge"
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-[0.625rem] px-3.5 text-[0.875rem] font-medium transition-colors",
        active ? "bg-charcoal text-white" : "bg-forest text-white hover:bg-forest-700",
      )}
    >
      <Refrigerator className="size-4" aria-hidden strokeWidth={1.75} />
      My Fridge
      {hydrated && count > 0 && (
        <span className="rounded-[5px] bg-white/15 px-1.5 text-[0.75rem] tabular-nums" aria-label={`${count} items`}>
          {count}
        </span>
      )}
    </Link>
  );
}

const MOBILE = [
  { href: "/my-fridge", label: "Fridge", icon: Refrigerator },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/meal-planner", label: "Plan", icon: CalendarDays },
  { href: "/shopping-list", label: "List", icon: ShoppingBasket },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data, hydrated } = useKitchen();
  const toBuy = data.shoppingList.filter((i) => !i.purchased).length;
  return (
    <nav
      data-bottom-nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-ink" : "text-muted",
                )}
              >
                {active && <span aria-hidden className="absolute inset-x-6 top-0 h-[2px] rounded-b bg-forest" />}
                <Icon className="size-[1.35rem]" aria-hidden strokeWidth={active ? 2 : 1.6} />
                {label}
                {href === "/shopping-list" && hydrated && toBuy > 0 && (
                  <span className="absolute left-1/2 top-2 ml-2 min-w-4 rounded-[5px] bg-forest px-1 text-center text-[0.625rem] font-semibold leading-4 text-white" aria-label={`${toBuy} to buy`}>
                    {toBuy}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
