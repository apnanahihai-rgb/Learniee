import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  getBankAccountForTeacher,
  upsertBankAccountForTeacher,
  TeacherPayoutError,
} from "@/features/shared/server/teacherPayout.service";

/**
 * GET/PUT — Teacher's own payout bank details (Teacher Payouts, Sep
 * 9, 2026). Self-managed; Accounts/Admin only ever read it (via the
 * Payment Queue / mass-pay flow), never edit it here.
 */
export async function GET(req: Request) {
  const teacher = await requireTeacherId(req);

  if ("error" in teacher) {
    return teacher.error;
  }

  const bankAccount = await getBankAccountForTeacher(teacher.teacherId);

  return NextResponse.json({ bankAccount });
}

export async function PUT(req: Request) {
  const teacher = await requireTeacherId(req);

  if ("error" in teacher) {
    return teacher.error;
  }

  try {
    const body = await req.json();
    const bankAccount = await upsertBankAccountForTeacher(teacher.teacherId, {
      accountHolderName: body.accountHolderName,
      accountNumber: body.accountNumber,
      ifscCode: body.ifscCode,
      bankName: body.bankName,
      branchName: body.branchName,
    });

    return NextResponse.json({ success: true, bankAccount });
  } catch (error) {
    if (error instanceof TeacherPayoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher bank-account PUT error:", error);
    return NextResponse.json({ error: "Failed to save bank details." }, { status: 500 });
  }
}
