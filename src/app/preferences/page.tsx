import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { AppearanceControls } from "@/components/preferences/appearance-controls";

export const metadata: Metadata = {
  title: "Preferences & Data",
  description: "Set cooking preferences, pantry staples, diets and equipment, and export or import your data.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/preferences" },
};

export default function PreferencesPage() {
  return (
    <div className="container-page pt-8 sm:pt-12">
      <PageHeader eyebrow="Settings" title="Preferences & data" description="A kitchen that feels like yours. Choose your look and cooking preferences." />
      <div className="mt-8 max-w-4xl">
        <AppearanceControls />
        <div className="mt-8"><PreferencesForm /></div>
      </div>
    </div>
  );
}
