import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { AdScriptLoader } from "@/components/ads/ad-script-loader";
import { AccountProvider } from "@/components/account/account-provider";
import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { BottomNav } from "@/components/layout/nav-links";
import { ServiceWorkerRegistration } from "@/components/layout/service-worker";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/theme/appearance";
import { ThemeWatcher } from "@/lib/theme/store";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/seo/site";
import "./globals.css";

/** Editorial serif for headlines and recipe titles. */
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

/** Precise, neutral sans for the interface. */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} – ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} – ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} – ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F0E8" },
    { media: "(prefers-color-scheme: dark)", color: "#171B1A" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${geist.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <ToastProvider>
          <AccountProvider>
          <AssistantProvider>
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <SiteFooter />
            <BottomNav />
          </AssistantProvider>
          </AccountProvider>
        </ToastProvider>
        <ThemeWatcher />
        <ServiceWorkerRegistration />
        <AdScriptLoader />
      </body>
    </html>
  );
}
