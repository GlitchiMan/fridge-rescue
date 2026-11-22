import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/data/guides";

export const metadata: Metadata = {
  title: "Cooking guides & meal ideas",
  description: "Practical guides for cooking with what you have: leftover rice, eggs and potatoes, near-empty fridges, budget dinners and more.",
  alternates: { canonical: "/ideas" },
};

export default function IdeasPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <p className="eyebrow">Ideas</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Cooking guides</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">Short, practical guides for the questions that come up at the fridge door.</p>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/ideas/${g.slug}`} className="card group flex h-full flex-col p-6 transition-shadow hover:shadow-lift">
              <h2 className="text-2xl font-semibold group-hover:text-forest">{g.title}</h2>
              <p className="mt-2 flex-1 text-muted">{g.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-forest">Read guide <ArrowRight className="size-4" aria-hidden /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
