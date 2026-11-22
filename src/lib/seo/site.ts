export const SITE_NAME = "Fridge Rescue";
export const SITE_TAGLINE = "Turn what's in your fridge into something delicious.";
export const SITE_SECONDARY_TAGLINE = "Less waste. More taste. More savings.";
export const SITE_DESCRIPTION =
  "Tell Fridge Rescue what ingredients you have and get realistic recipes you can cook right now – with clear notes on what's missing. Free, no sign-up.";

/** Public site URL from env; never hard-code a domain. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getContactEmail(): string | null {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
