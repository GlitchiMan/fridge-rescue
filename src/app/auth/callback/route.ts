import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, safeNextPath } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const OTP_TYPES: EmailOtpType[] = ["signup", "recovery", "email", "email_change", "invite", "magiclink"];

/** Finishes email confirmation, password recovery and Google sign-in. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const fail = NextResponse.redirect(new URL("/login?error=link", origin));
  const config = getSupabaseConfig();
  if (!config) return fail;

  const cookieStore = await cookies();
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type && OTP_TYPES.includes(type)) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  return ok ? NextResponse.redirect(new URL(next, origin)) : fail;
}
