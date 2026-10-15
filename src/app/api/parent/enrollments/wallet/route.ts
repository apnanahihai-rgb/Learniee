import { NextResponse } from "next/server";

import { requireVerifiedParentId } from "@/features/parent/server/verifiedAuth";
import {
  EnrollmentError,
  payEnrollmentWithWallet,
  type WalletEnrollmentInput,
} from "@/features/parent/server/enrollment.service";
import { WalletError } from "@/features/shared/server/wallet.service";

/**
 * POST
 *
 * Pays a new Enrollment's first cycle from the Parent's Wallet balance — the
 * wallet alternative to `/api/parent/enrollments/order` + `/verify`. Same body
 * as the order route, plus `requestId` (a client-generated UUID that makes a
 * retry safe). The whole price must be covered by the balance (402 otherwise).
 */
export async function POST(req: Request) {
  try {
    const parent = await requireVerifiedParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const input: WalletEnrollmentInput = await req.json();

    if (!input.studentId || !input.teacherId || !input.courseId) {
      return NextResponse.json(
        { error: "studentId, teacherId, and courseId are required." },
        { status: 400 },
      );
    }

    if (!input.scheduleDays?.length || !input.scheduleTime) {
      return NextResponse.json(
        { error: "Pick which days and what time classes should happen." },
        { status: 400 },
      );
    }

    const enrollment = await payEnrollmentWithWallet(parent.parentId, input);

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    if (error instanceof EnrollmentError || error instanceof WalletError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Parent enrollments/wallet POST error:", error);

    return NextResponse.json(
      { error: "Failed to pay for the enrollment from your wallet." },
      { status: 500 },
    );
  }
}
