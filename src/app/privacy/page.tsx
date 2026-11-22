import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Fridge Rescue handles your data: your kitchen stays in your browser, with no accounts and no tracking by default.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ContentPage eyebrow="Legal" title="Privacy policy" updated="22 November 2026" intro="The short version: Fridge Rescue doesn't need an account, and the things you enter about your kitchen stay in your own browser.">
      <h2>What we store, and where</h2>
      <p>
        When you use My Fridge, favourites, the shopping list, the meal planner, cooking history, preferences or cookie choices, that information is saved in your browser&apos;s <strong>local storage</strong> on your device. It is not sent to our servers and we cannot see it.
      </p>
      <ul>
        <li>It stays until you delete it (Preferences → Delete all my data) or clear your browser&apos;s site data.</li>
        <li>It isn&apos;t shared between devices or browsers. Use <Link href="/preferences">Export / Import</Link> to move it yourself.</li>
        <li>Anyone with access to this browser profile can see it.</li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t require registration or collect your name or email to use the site.</li>
        <li>We don&apos;t run analytics or advertising trackers at the moment.</li>
        <li>We don&apos;t sell personal data.</li>
        <li>We don&apos;t put your ingredients or other personal data in page addresses or metadata.</li>
      </ul>

      <h2>Technical data</h2>
      <p>
        Like any website, our hosting provider receives technical information needed to deliver pages – such as your IP address, browser type and the page requested – and may keep it in server logs for security and reliability. Fonts are served from our own domain, so loading a page doesn&apos;t contact a font provider.
      </p>
      <p>
        If you install Fridge Rescue as an app, a service worker stores copies of pages and site files in your browser so they load faster and some pages work offline. This cache contains only public site content.
      </p>

      <h2>Contacting us</h2>
      <p>
        The contact form opens your own email app. If you email us, we receive whatever you choose to send and use it only to reply.
      </p>

      <h2>Cookies and similar technologies</h2>
      <p>
        We currently use only browser storage that&apos;s necessary for features you ask for. If we introduce analytics or advertising in the future, we&apos;ll update this policy and, where the law requires it, ask for your consent before anything non-essential is loaded. You can review your choices any time on the <Link href="/cookie-settings">cookie settings</Link> page.
      </p>

      <h2>Your rights</h2>
      <p>
        Because your kitchen data stays on your device, you control it directly: view it in the app, export it, or delete it. Depending on where you live, you may have rights to access, correct or delete personal data a service holds about you – <Link href="/contact">contact us</Link> with any request.
      </p>

      <h2>Children</h2>
      <p>Fridge Rescue is a general-audience cooking tool and doesn&apos;t knowingly collect personal data from children.</p>

      <h2>Changes</h2>
      <p>We&apos;ll update this page if how we handle data changes, and revise the date above.</p>
    </ContentPage>
  );
}
