import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencesForm } from "@/components/preferences/preferences-form";

export const metadata: Metadata = {
  title: "Preferences & Data",
  description: "Set cooking preferences, pantry staples, diets and equipment, and export or import your data.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/preferences" },
};

export default function PreferencesPage() {
  return (
    <div className="container-page pt-8 sm:pt-12">
      <PageHeader eyebrow="Settings" title="Preferences & data" description="All optional – Fridge Rescue works without any setup." />
      <div className="mt-4 max-w-4xl">
        <PreferencesForm />
      </div>
    </div>
  );
}
