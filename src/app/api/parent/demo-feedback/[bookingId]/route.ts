import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  DemoFeedbackError,
  getDemoSurvey,
  submitDemoFeedback,
  type SubmitDemoFeedbackInput,
} from "@/features/parent/server/demoFeedback.service";

/** GET — what the survey page shows for one demo (also marks it opened). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const survey = await getDemoSurvey(parent.parentId, bookingId);

    return NextResponse.json({ success: true, ...survey });
  } catch (error) {
    if (error instanceof DemoFeedbackError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent demo-feedback/[bookingId] GET error:", error);

    return NextResponse.json({ error: "Failed to load the survey." }, { status: 500 });
  }
}

/** POST — answer the 3-question survey (once) and get the next step. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await params;

    const parent = await requireParentId(req);
    if ("error" in parent) return parent.error;

    const input: SubmitDemoFeedbackInput = await req.json().catch(() => ({}));

    const routing = await submitDemoFeedback(parent.parentId, bookingId, input);

    return NextResponse.json({ success: true, routing }, { status: 201 });
  } catch (error) {
    if (error instanceof DemoFeedbackError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent demo-feedback/[bookingId] POST error:", error);

    return NextResponse.json({ error: "Failed to save your answers." }, { status: 500 });
  }
}
