import { NextResponse } from "next/server";

import { runEnrollmentAutoLapse } from "@/features/shared/server/enrollmentAutoLapse.service";

/**
 * GET /api/cron/enrollment-auto-lapse
 *
 * Daily sweep that flips any `ACTIVE` Enrollment with no class
 * conducted in the last 45 days to `LAPSED` (resolves
 * 06-OPEN-DECISIONS.md #27). Wired up as a Vercel Cron job (see
 * vercel.json) — unlike the 5-minute session-reminders cron, a
 * 45-day threshold has no need for tight cadence, so this runs once
 * a day and works unchanged on the Hobby plan.
 *
 * Auth: expects `Authorization: Bearer ${CRON_SECRET}`, same
 * convention as `/api/cron/session-reminders`. Vercel sends this
 * header automatically on Vercel Cron-triggered requests once
 * `CRON_SECRET` is set in the project's environment variables — see
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
 * Can also be triggered manually (e.g. `curl` with the same header)
 * for testing, or by an external scheduler if still on a plan/host
 * where Vercel Cron isn't available.
 */
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
    }

    const result = await runEnrollmentAutoLapse();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Enrollment auto-lapse cron error:", error);

    return NextResponse.json(
      { error: "Failed to run enrollment auto-lapse job." },
      { status: 500 },
    );
  }
}
