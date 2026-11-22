import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using Fridge Rescue, including important notes about food safety and allergies.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ContentPage eyebrow="Legal" title="Terms of use" updated="22 November 2026">
      <p>By using Fridge Rescue you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>
      <h2>The service</h2>
      <p>
        Fridge Rescue provides recipe ideas, cooking instructions and kitchen-organising tools for personal, non-commercial use. It&apos;s provided free of charge, “as is”, and may change or be unavailable from time to time.
      </p>
      <h2>Food safety and allergies</h2>
      <ul>
        <li>You&apos;re responsible for deciding whether food is safe to eat. Dates shown in the app are the ones you entered; they don&apos;t prove food is safe or unsafe.</li>
        <li>Dietary and allergen labels are derived from typical ingredients. Products vary, so always read labels and consider cross-contact. Fridge Rescue does not guarantee any recipe is free from any allergen.</li>
        <li>Follow the guidance of your local food safety authority, especially for meat, poultry, fish, eggs and leftovers, and when cooking for vulnerable people.</li>
        <li>Cooking involves heat, sharp tools and hot liquids – take care.</li>
      </ul>
      <h2>Content</h2>
      <p>
        Recipes, text and illustrations on Fridge Rescue are original and protected by copyright. You may print or share recipes for personal use with a link back to the page. Please don&apos;t republish them in bulk.
      </p>
      <h2>Your data</h2>
      <p>
        Your kitchen data is stored in your browser, as described in our <Link href="/privacy">privacy policy</Link>. You&apos;re responsible for keeping backups if you need them.
      </p>
      <h2>Acceptable use</h2>
      <p>Don&apos;t misuse the site, attempt to disrupt it, or access it with automated tools in a way that places unreasonable load on it.</p>
      <h2>Liability</h2>
      <p>
        To the extent permitted by law, we aren&apos;t liable for losses arising from use of the site or reliance on its content. Nothing in these terms limits rights you have under applicable consumer law.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms; the date above shows the latest version. Questions? <Link href="/contact">Contact us</Link>.</p>
    </ContentPage>
  );
}
