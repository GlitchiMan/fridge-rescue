import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server/config";
import { refreshTrends } from "@/lib/trends/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily trend refresh. Protected by CRON_SECRET (sent as a Bearer token –
 * Vercel Cron does this automatically when CRON_SECRET is set).
 * Locally: `npm run trends:refresh` while the dev server is running.
 */
export async function GET(req: Request) {
  const { cronSecret } = getServerConfig();
  if (!cronSecret) return NextResponse.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  const result = await refreshTrends();
  return NextResponse.json({ ok: result.ok, message: result.message, takenAt: result.snapshot?.takenAt ?? null }, { status: result.ok ? 200 : 409 });
}
