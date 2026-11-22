import type { Metadata } from "next";
import { ShoppingList } from "@/components/shopping/shopping-list";

export const metadata: Metadata = {
  title: "Shopping List",
  description: "Your shopping list, grouped by aisle.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/shopping-list" },
};

export default function ShoppingListPage() {
  return (
    <div className="container-page py-8 sm:py-12">
      <p className="eyebrow">Shop smart</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Shopping list</h1>
      <p className="mt-2 text-lg text-muted">Only what you actually need – grouped so it&apos;s quick at the store.</p>
      <div className="mt-8">
        <ShoppingList />
      </div>
    </div>
  );
}
