#!/usr/bin/env node
/**
 * Manual trend refresh for local development:
 *   1. start the app (npm run dev, or npm run build && npm start)
 *   2. npm run trends:refresh
 * Reads CRON_SECRET from the environment or .env.local. BASE_URL defaults to
 * http://localhost:3000. This does NOT schedule anything – on a host, use its
 * scheduler (vercel.json contains a daily cron for Vercel).
 */
import { existsSync, readFileSync } from "node:fs";

function fromEnvFile(name) {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

const secret = process.env.CRON_SECRET || fromEnvFile("CRON_SECRET");
const base = process.env.BASE_URL || "http://localhost:3000";
if (!secret) {
  console.error("Set CRON_SECRET in .env.local first (any long random string).");
  process.exit(1);
}
try {
  const res = await fetch(`${base}/api/cron/refresh-trends`, { headers: { Authorization: `Bearer ${secret}` } });
  const body = await res.json();
  console.log(`[trends] ${res.status} ${body.message}`);
  process.exit(res.ok ? 0 : 1);
} catch (e) {
  console.error(`[trends] Could not reach ${base} – is the app running? (${e.message})`);
  process.exit(1);
}
