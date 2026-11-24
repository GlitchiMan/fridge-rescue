import type { Metadata } from "next";
import { AuthShell } from "@/components/account/auth-shell";

export const metadata: Metadata = { title: "Create your account", robots: { index: false, follow: false } };

export default function Page() {
  return <AuthShell mode="signup" />;
}
