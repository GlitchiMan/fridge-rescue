import type { Metadata } from "next";
import { AuthShell } from "@/components/account/auth-shell";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default function Page() {
  return <AuthShell mode="forgot" />;
}
