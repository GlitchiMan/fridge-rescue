import type { Metadata } from "next";
import { CookieSettingsForm } from "@/components/consent/cookie-settings-form";
import { ContentPage } from "@/components/content/content-page";

export const metadata: Metadata = {
  title: "Cookie settings",
  description: "Review and change your privacy and cookie choices for Fridge Rescue.",
  alternates: { canonical: "/cookie-settings" },
};

export default function CookieSettingsPage() {
  return (
    <ContentPage eyebrow="Privacy" title="Cookie & privacy settings" intro="You're in control. Change these choices whenever you like – they're stored in this browser.">
      <CookieSettingsForm />
    </ContentPage>
  );
}
