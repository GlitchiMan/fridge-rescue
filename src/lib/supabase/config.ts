/** Public Supabase settings. The publishable key is safe in the browser because RLS protects the data. */
export function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key || !/^https?:\/\//.test(url)) return null;
  return { url, key };
}

export const isGoogleAuthEnabled = () => process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED?.trim() === "true";

/** Only same-site paths are allowed as post-login destinations. */
export function safeNextPath(next: string | null | undefined, fallback = "/my-fridge"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const u = new URL(next, "https://fridge.invalid");
    return u.origin === "https://fridge.invalid" ? `${u.pathname}${u.search}` : fallback;
  } catch {
    return fallback;
  }
}
