"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useAccount } from "./account-provider";

/** Header entry. Hidden on production builds until Supabase is configured. */
export function AccountLink() {
  const { configured, status, email, name } = useAccount();
  if (!configured && process.env.NODE_ENV === "production") return null;
  if (status === "signed-in") {
    const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();
    return (
      <Link href="/account" aria-label="Your account" className="inline-flex size-9 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white transition-transform active:scale-95">
        {initial}
      </Link>
    );
  }
  return (
    <Link href="/login" className="inline-flex min-h-9 items-center gap-1.5 rounded-[0.625rem] px-2 text-[0.875rem] font-medium text-ink-soft transition-colors hover:text-ink sm:px-3">
      <UserRound className="size-4" aria-hidden strokeWidth={1.75} />
      <span className="hidden sm:inline">Sign in</span>
      <span className="sr-only sm:hidden">Sign in</span>
    </Link>
  );
}
