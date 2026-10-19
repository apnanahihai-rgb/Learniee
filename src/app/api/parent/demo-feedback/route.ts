import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { listPendingDemoSurveys } from "@/features/parent/server/demoFeedback.service";

/** GET — ended demos the Parent hasn't answered the survey for yet. */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const surveys = await listPendingDemoSurveys(parent.parentId);

    return NextResponse.json({ success: true, surveys });
  } catch (error) {
    console.error("Parent demo-feedback GET error:", error);

    return NextResponse.json({ error: "Failed to load demo surveys." }, { status: 500 });
  }
}
