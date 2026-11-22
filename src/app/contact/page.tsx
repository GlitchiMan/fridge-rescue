import type { Metadata } from "next";
import { ContactForm } from "@/components/content/contact-form";
import { ContentPage } from "@/components/content/content-page";
import { getContactEmail } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Fridge Rescue – recipe corrections, ideas and questions.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const email = getContactEmail();
  return (
    <ContentPage eyebrow="Contact" title="Say hello" intro="Spotted a recipe mistake, have a feature idea, or a question about your data? We read every message.">
      {email ? (
        <>
          <p>
            Email us at <a href={`mailto:${email}`}>{email}</a>, or use the form below – it opens a pre-filled message in your own email app, so nothing is sent through our servers.
          </p>
          <ContactForm email={email} />
        </>
      ) : (
        <p className="rounded-[0.75rem] bg-orange-soft px-5 py-4 text-orange-ink">
          A contact address hasn&apos;t been configured for this site yet. (Site owner: set <code>NEXT_PUBLIC_CONTACT_EMAIL</code> – see the README.)
        </p>
      )}
      <p className="text-sm text-muted">Please don&apos;t include sensitive personal information. For questions about your data, note that we don&apos;t hold any of your kitchen data on our servers.</p>
    </ContentPage>
  );
}
