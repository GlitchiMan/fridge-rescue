import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "About",
  description: "Why Fridge Rescue exists: helping people cook with what they already have, waste less and spend less.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ContentPage eyebrow="About" title="A smarter way to answer “what's for dinner?”" intro="Fridge Rescue started with a familiar moment: standing in front of an open fridge, looking at a few eggs, half an onion and some cheese, and not knowing what to make.">
      <p>
        Most recipe websites start from the dish and send you shopping. We wanted the opposite: a tool that starts from what&apos;s already in your kitchen, tells you honestly how close you are to a meal, and helps you use food before it&apos;s forgotten.
      </p>
      <h2>What we believe</h2>
      <ul>
        <li><strong>Useful before beautiful.</strong> Every feature has to save you time, money or food.</li>
        <li><strong>Honest suggestions.</strong> We explain every recommendation and never pretend a recipe is ready when it isn&apos;t.</li>
        <li><strong>No sign-up wall.</strong> You can use everything without an account.</li>
        <li><strong>Privacy by default.</strong> Your kitchen data stays in your browser.</li>
        <li><strong>Real food knowledge, no invented numbers.</strong> We don&apos;t publish made-up ratings, nutrition figures or savings claims.</li>
      </ul>
      <h2>Our recipes</h2>
      <p>
        Every recipe on Fridge Rescue is written for this site, built around everyday ingredients and checked so the ingredient list matches the method. Where a recipe has a photo, it&apos;s a styled serving suggestion – your dish may look a little different.
      </p>
      <h2>Get in touch</h2>
      <p>
        Found a mistake in a recipe or have an idea? We&apos;d love to hear from you on our <Link href="/contact">contact page</Link>.
      </p>
    </ContentPage>
  );
}
