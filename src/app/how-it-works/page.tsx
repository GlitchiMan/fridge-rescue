import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description: "How Fridge Rescue matches recipes to the ingredients you already have – and how it explains every suggestion.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <ContentPage eyebrow="How it works" title="Cook with what you've got" intro="Fridge Rescue is a recipe finder that starts with your kitchen instead of a shopping trip. Here's exactly what happens behind the scenes.">
      <h2>1. Tell us what you have</h2>
      <p>
        Type ingredients on the homepage or in <Link href="/my-fridge">My Fridge</Link>. We understand common synonyms – capsicum and bell pepper, scallion and spring onion, garbanzo beans and chickpeas – and store each ingredient under one standard name so nothing is counted twice.
      </p>
      <p>Amounts and dates are optional. If you don&apos;t enter an amount, we record it as <em>unknown</em> rather than guessing.</p>

      <h2>2. We compare every recipe with your kitchen</h2>
      <p>Each recipe lists its ingredients with real quantities. For every recipe we check:</p>
      <ul>
        <li>Which essential ingredients you have (optional extras and “to taste” seasonings never block a recipe).</li>
        <li>Whether your known amounts are enough – converting compatible units like kg and g, but never treating pieces as grams unless we can make a clearly labelled estimate.</li>
        <li>Whether a recipe-approved substitute you own could stand in, like Greek yogurt for sour cream.</li>
        <li>Pantry staples such as oil or salt – but only the ones you&apos;ve told us you keep.</li>
      </ul>

      <h2>3. Recipes are ranked – and explained</h2>
      <p>
        Recipes are sorted with a transparent scoring system: how many ingredients you have, whether anything is missing, whether it uses something near the date you entered, how long it takes and whether it fits your preferences. There&apos;s no randomness and nothing is sponsored. Every card tells you why it&apos;s there, for example:
      </p>
      <ul>
        <li>“You have 5 of 6 ingredients. Missing: sour cream.”</li>
        <li>“Need another 150 g potatoes.”</li>
        <li>“Ingredients match — check quantities” when amounts are unknown.</li>
      </ul>

      <h2>4. Cook, then update your fridge</h2>
      <p>
        Follow the step-by-step cooking mode with built-in timers. When you&apos;re done, mark the recipe as cooked – we&apos;ll show exactly how your fridge would change and only update it if you confirm.
      </p>

      <h2>About dates and food safety</h2>
      <p>
        If you enter use-by or best-before dates, we highlight items approaching them so you can use them in time. Dates are only part of the picture: storage, packaging and the food&apos;s condition matter too. We never tell you something is safe to eat, and we don&apos;t suggest recipes with items past a use-by date you&apos;ve entered.
      </p>

      <h2>Your data stays with you</h2>
      <p>
        There&apos;s no account. Everything you enter is saved in your browser on this device. Read more in our <Link href="/privacy">privacy policy</Link>.
      </p>
      <p className="pt-4">
        <Link href="/#find" className={buttonClass("primary", "lg", "!text-white !no-underline")}>Find my next meal</Link>
      </p>
    </ContentPage>
  );
}
