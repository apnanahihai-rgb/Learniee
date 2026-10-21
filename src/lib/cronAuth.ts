import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Shared auth for every /api/cron/* route. Fails CLOSED: if CRON_SECRET is
 * not set, every request is refused (401). Returns a 401 response to send
 * back, or null when the caller is allowed to continue.
 */
export function requireCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";

  if (!secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}