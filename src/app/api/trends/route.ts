import { NextResponse } from "next/server";
import { readTrends } from "@/lib/trends/engine";

export const dynamic = "force-dynamic";

/** Serves the last cached snapshot. Never calls third-party APIs per visit. */
export async function GET() {
  try {
    const data = await readTrends();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ status: "error", mode: "fresh", snapshot: null, trends: [], message: "Trends are unavailable right now." }, { status: 500 });
  }
}
