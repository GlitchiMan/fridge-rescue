import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { GUIDES } from "@/data/guides";

export const metadata: Metadata = {
  title: "Cooking guides & meal ideas",
  description: "Practical guides for cooking with what you have: leftover rice, eggs and potatoes, near-empty fridges, budget dinners and more.",
  alternates: { canonical: "/ideas" },
};

export default function IdeasPage() {
  return (
    <div className="container-page pt-8 sm:pt-12">
      <PageHeader eyebrow="Guides" title="Cooking guides" description="Short, practical guides for the questions that come up at the fridge door." />
      <ul className="divide-y divide-line border-b border-line">
        {GUIDES.map((g, i) => (
          <li key={g.slug}>
            <Link href={`/ideas/${g.slug}`} className="group grid gap-3 py-8 transition-colors sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-8 sm:py-10">
              <span className="font-display text-[0.9375rem] italic text-muted">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="text-[1.75rem] leading-tight transition-colors group-hover:text-accent sm:text-[2.25rem]">{g.title}</h2>
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{g.description}</p>
              </div>
              <ArrowUpRight className="hidden size-6 text-faint transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink sm:block" aria-hidden strokeWidth={1.5} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
