import { NextResponse } from "next/server";

import { runDemoReminderSweep } from "@/features/shared/server/demoReminder.service";

/**
 * GET /api/cron/demo-reminders
 *
 * Demo reminders (1 day / 1 hour before), the post-demo survey prompt
 * and survey nudges. Needs a ~5-minute cadence, so it is called by
 * `scheduler/scheduler.sh` on the Docker host and is deliberately NOT
 * in `vercel.json` (Hobby plan allows daily crons only). Idempotent.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`, same as the other cron routes.
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

    const result = await runDemoReminderSweep();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Demo reminders cron error:", error);

    return NextResponse.json({ error: "Failed to run demo reminders." }, { status: 500 });
  }
}
