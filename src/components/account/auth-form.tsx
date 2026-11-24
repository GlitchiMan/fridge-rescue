"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- a full reload restarts auth and storage cleanly */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/brand/logo";
import { getSupabaseConfig, isGoogleAuthEnabled, safeNextPath } from "@/lib/supabase/config";
import { cn } from "@/lib/utils/cn";

export type AuthMode = "signup" | "login" | "forgot" | "reset";

const COPY: Record<AuthMode, { title: string; sub: string; submit: string }> = {
  signup: { title: "Make your kitchen yours.", sub: "Create your free account to save everything you love, across all your devices.", submit: "Create my free account" },
  login: { title: "Welcome back.", sub: "Sign in to pick up where you left off.", submit: "Sign in" },
  forgot: { title: "Reset your password.", sub: "Enter your email and we'll send you a reset link.", submit: "Send reset link" },
  reset: { title: "Choose a new password.", sub: "Use at least 8 characters.", submit: "Save new password" },
};

const inputClass =
  "w-full min-h-12 rounded-[0.625rem] border border-white/15 bg-white/[0.04] px-3.5 text-[1rem] text-white outline-none transition-[border-color,box-shadow] placeholder:text-white/40 hover:border-white/30 focus:border-[#BD9475] focus:shadow-[0_0_0_3px_rgb(189_148_117_/_0.25)] disabled:opacity-50";

function friendlyError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "That email or password isn't right.";
    case "email_not_confirmed":
      return "Please confirm your email first. Check your inbox.";
    case "weak_password":
      return "Please choose a stronger password.";
    case "same_password":
      return "Choose a password you haven't used here before.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const params = useSearchParams();
  const configured = Boolean(getSupabaseConfig());
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") === "link" ? "That link is invalid or has expired. Please try again." : null);
  const [notice, setNotice] = useState<string | null>(null);
  const copy = COPY[mode];
  const needsEmail = mode !== "reset";
  const needsPassword = mode !== "forgot";
  const showGoogle = (mode === "signup" || mode === "login") && (isGoogleAuthEnabled() || !configured);
  const query = next === "/my-fridge" ? "" : `?next=${encodeURIComponent(next)}`;

  const client = async () => (await import("@/lib/supabase/browser")).getBrowserSupabase();
  const callback = (to: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (needsPassword && mode !== "login" && password.length < 8) return setError("Use at least 8 characters.");
    if (needsPassword && !password) return setError("Enter your password.");
    setBusy(true);
    try {
      const supabase = await client();
      if (!supabase) return setError("Accounts aren't connected yet.");
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: callback(next), data: fullName.trim() ? { full_name: fullName.trim().slice(0, 80) } : undefined } });
        if (err) return setError(friendlyError(err.code));
        if (data.session) {
          window.location.href = next;
          return;
        }
        setNotice("Check your inbox to confirm your email.");
      } else if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) return setError(friendlyError(err.code));
        window.location.href = next;
      } else if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callback("/reset-password") });
        if (err && err.code?.startsWith("over_")) return setError(friendlyError(err.code));
        setNotice("If that email has an account, a reset link is on its way.");
      } else {
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) return setError(err.code === "session_not_found" || err.name === "AuthSessionMissingError" ? "This reset link has expired. Please request a new one." : friendlyError(err.code));
        window.location.href = "/account";
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      const supabase = await client();
      const res = await supabase?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback(next) } });
      if (!res || res.error) setError("Google sign-in isn't available right now.");
    } catch {
      setError("Google sign-in isn't available right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-[29rem] rounded-[1.125rem] border border-white/10 bg-[#1F2523] p-6 text-white shadow-lift sm:p-8">
      <p className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-[-0.02em]">
        <LogoMark className="size-5" /> Fridge Rescue
      </p>
      <h1 className="mt-6 font-display text-[2.375rem] font-normal leading-[1.04] tracking-[-0.028em] text-[#F5F0E8]">{copy.title}</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/70">{copy.sub}</p>

      {!configured && (
        <p role="status" className="mt-4 rounded-[0.625rem] border border-[#E3B27A]/40 bg-[#E3B27A]/10 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[#F0CFA6]">
          Preview only: accounts aren&apos;t connected yet, so this form can&apos;t sign anyone in.
        </p>
      )}

      {notice ? (
        <p role="status" className="mt-6 rounded-[0.625rem] bg-[#183C31] px-4 py-3 text-[0.9375rem]">{notice}</p>
      ) : (
        <>
          {showGoogle && (
            <>
              <button type="button" onClick={() => void google()} disabled={!configured || busy} className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-[0.75rem] border border-white/15 text-[0.9375rem] font-semibold transition-[background-color,transform] hover:bg-white/[0.05] active:scale-[0.99] disabled:opacity-50">
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3ZM12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22ZM6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6ZM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z" /></svg>
                Continue with Google
              </button>
              <div className="mt-5 border-t border-white/10" />
            </>
          )}
          <form onSubmit={(e) => void submit(e)} noValidate className={cn("space-y-4", showGoogle ? "mt-5" : "mt-6")}>
            {mode === "signup" && (
              <div>
                <label htmlFor="auth-name" className="mb-1.5 block text-[0.8125rem] font-medium text-white/85">First name <span className="font-normal text-white/60">(optional)</span></label>
                <input id="auth-name" type="text" autoComplete="given-name" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!configured} className={inputClass} />
              </div>
            )}
            {needsEmail && (
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-[0.8125rem] font-medium text-white/85">Email address</label>
                <input id="auth-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={!configured} className={inputClass} />
              </div>
            )}
            {needsPassword && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="auth-password" className="text-[0.8125rem] font-medium text-white/85">{mode === "reset" ? "New password" : "Password"}</label>
                  {mode === "login" && <Link href="/forgot-password" className="text-[0.8125rem] text-white/70 underline-offset-4 hover:text-white hover:underline">Forgot password?</Link>}
                </div>
                <div className="relative">
                  <input id="auth-password" type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={!configured} className={cn(inputClass, "pr-16")} />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1.5 top-1/2 min-h-9 -translate-y-1/2 rounded-[0.5rem] px-2.5 text-[0.8125rem] text-white/70 hover:text-white">
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-[#F2B8A8]">{error}</p>}
            <button type="submit" disabled={!configured || busy} className="min-h-13 w-full rounded-[0.75rem] bg-[#183C31] text-[1rem] font-semibold text-white transition-[background-color,transform] hover:bg-[#205040] active:scale-[0.99] disabled:opacity-60">
              {busy ? "Please wait…" : copy.submit}
            </button>
          </form>
        </>
      )}

      <p className="mt-5 text-center text-sm text-white/70">
        {mode === "signup" && <>Already have an account? <Link href={`/login${query}`} className="font-medium text-white underline underline-offset-4">Sign in</Link></>}
        {mode === "login" && <>New here? <Link href={`/signup${query}`} className="font-medium text-white underline underline-offset-4">Create a free account</Link></>}
        {(mode === "forgot" || mode === "reset") && <Link href="/login" className="font-medium text-white underline underline-offset-4">Back to sign in</Link>}
      </p>
      {(mode === "signup" || mode === "login") && (
        <p className="mt-3 text-center text-xs text-white/70">
          No account needed to use Fridge Rescue. <Link href="/my-fridge" className="underline underline-offset-2 hover:text-white">Continue as guest</Link>
        </p>
      )}
    </div>
  );
}
