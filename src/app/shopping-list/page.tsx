import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ShoppingList } from "@/components/shopping/shopping-list";

export const metadata: Metadata = {
  title: "Shopping List",
  description: "Your shopping list, grouped by aisle.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/shopping-list" },
};

export default function ShoppingListPage() {
  return (
    <div className="container-page pt-10 sm:pt-16">
      <PageHeader eyebrow="Shop" title="Shopping list" description="Only what you actually need – grouped so it's quick at the store." />
      <div className="mt-8">
        <ShoppingList />
      </div>
    </div>
  );
}
