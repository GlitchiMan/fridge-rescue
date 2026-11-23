import Image from "next/image";
import { Suspense } from "react";
import { getSiteImage } from "@/lib/images";
import { AuthForm, type AuthMode } from "./auth-form";

/** Photo-led sign-in layout shared by every auth screen. */
export function AuthShell({ mode }: { mode: AuthMode }) {
  const photo = getSiteImage("hero-kitchen");
  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] items-center gap-10 py-6 sm:py-10 lg:min-h-[calc(100dvh-10rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-14">
      {photo && (
        <div className="relative hidden aspect-[7/6] overflow-hidden rounded-[1.25rem] lg:block">
          <Image src={photo} alt="" fill sizes="(min-width: 1440px) 800px, 50vw" quality={85} className="object-cover object-[100%_45%]" />
        </div>
      )}
      <div className="flex justify-center">
        <Suspense fallback={<div className="h-[32rem] w-full max-w-[29rem] rounded-[1.125rem] bg-[#1F2523]" />}>
          <AuthForm mode={mode} />
        </Suspense>
      </div>
    </div>
  );
}
