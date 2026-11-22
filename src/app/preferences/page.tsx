import type { Metadata } from "next";
import { PreferencesForm } from "@/components/preferences/preferences-form";

export const metadata: Metadata = {
  title: "Preferences & Data",
  description: "Set cooking preferences, pantry staples, diets and equipment, and export or import your data.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/preferences" },
};

export default function PreferencesPage() {
  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Preferences &amp; data</h1>
      <p className="mt-2 text-lg text-muted">All optional – Fridge Rescue works without any setup.</p>
      <div className="mt-8">
        <PreferencesForm />
      </div>
    </div>
  );
}
