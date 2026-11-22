"use client";

import { BookOpen, CalendarDays, Heart, Refrigerator, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKitchen } from "@/hooks/use-kitchen";
import { cn } from "@/lib/utils/cn";

const DESKTOP = [
  { href: "/my-fridge", label: "My Fridge" },
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
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {DESKTOP.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-10 items-center rounded-full px-3.5 text-[0.93rem] font-semibold transition-colors",
                  active ? "bg-forest-50 text-forest" : "text-muted hover:bg-white hover:text-ink",
                )}
              >
                {l.label}
                {l.href === "/shopping-list" && hydrated && toBuy > 0 && (
                  <span className="ml-1.5 rounded-full bg-orange px-1.5 text-xs font-bold text-ink" aria-label={`${toBuy} items to buy`}>
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

const MOBILE = [
  { href: "/my-fridge", label: "My Fridge", icon: Refrigerator },
  { href: "/recipes", label: "Discover", icon: BookOpen },
  { href: "/meal-planner", label: "Plan", icon: CalendarDays },
  { href: "/shopping-list", label: "List", icon: ShoppingBasket },
  { href: "/saved", label: "Saved", icon: Heart },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data, hydrated } = useKitchen();
  const toBuy = data.shoppingList.filter((i) => !i.purchased).length;
  return (
    <nav
      data-bottom-nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
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
                  "relative flex min-h-15 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold",
                  active ? "text-forest" : "text-muted",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-forest-100")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
                {href === "/shopping-list" && hydrated && toBuy > 0 && (
                  <span className="absolute right-[18%] top-1.5 min-w-4 rounded-full bg-orange px-1 text-[0.65rem] leading-4 text-ink" aria-label={`${toBuy} to buy`}>
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
