import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import {
  createDemoBooking,
  getDemoBookingsForParent,
  DemoBookingError,
  type CreateDemoBookingInput,
} from "@/features/parent/server/demoCoupon.service";

/**
 * GET
 *
 * Lists every demo booking made by the logged-in parent. Not wired
 * into a screen yet — kept here alongside POST so the read path
 * doesn't need to be built later from scratch.
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const bookings = await getDemoBookingsForParent(parent.parentId);

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error("Parent demo-bookings GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch demo bookings." },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Books a demo session for one of the parent's children, with a
 * given teacher/course. Consumes a free coupon if any remain on the
 * account (2 total, not per child — 06-OPEN-DECISIONS.md #26),
 * otherwise records a flat ₹100 paid demo. Capped at 1 demo per
 * (teacher, subject, child) — see demoCoupon.service.ts.
 */
export async function POST(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: CreateDemoBookingInput = await req.json();

    if (!input.studentId || !input.teacherId || !input.courseId) {
      return NextResponse.json(
        { error: "studentId, teacherId, and courseId are required." },
        { status: 400 },
      );
    }

    // A demo has to be arranged for a specific time — don't accept
    // a booking with no scheduledAt. (Requested change: date/time
    // selection is now mandatory before booking, not optional.)
    if (!input.scheduledAt) {
      return NextResponse.json(
        { error: "Pick a date and time for the demo before booking." },
        { status: 400 },
      );
    }

    const result = await createDemoBooking(parent.parentId, input);

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof DemoBookingError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Parent demo-bookings POST error:", error);

    return NextResponse.json(
      { error: "Failed to book demo." },
      { status: 500 },
    );
  }
}
