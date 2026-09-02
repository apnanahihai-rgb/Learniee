import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/verifyAdmin";
import { checkVerifiedToken } from "@/lib/otp";
import { createStaffAccount, listStaffAccounts } from "@/features/admin/server/staffAccount.service";

const OTP_PURPOSE_EMAIL = "staff-account-email";
const OTP_PURPOSE_PHONE = "staff-account-phone";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await listStaffAccounts();
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || typeof admin.sub !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { firstName, lastName, email, phone, role, emailVerifiedToken, phoneVerifiedToken } = body;

  if (!firstName || !lastName || !email || !phone || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (role !== "HR" && role !== "ACCOUNTS") {
    return NextResponse.json({ error: "Role must be HR or ACCOUNTS." }, { status: 400 });
  }

  if (!emailVerifiedToken || !checkVerifiedToken(emailVerifiedToken, email, OTP_PURPOSE_EMAIL)) {
    return NextResponse.json(
      { error: "Email is not verified. Please verify the email OTP first." },
      { status: 400 },
    );
  }

  if (!phoneVerifiedToken || !checkVerifiedToken(phoneVerifiedToken, phone, OTP_PURPOSE_PHONE)) {
    return NextResponse.json(
      { error: "Phone is not verified. Please verify the phone OTP first." },
      { status: 400 },
    );
  }

  const adminRow = await prisma.admin.findUnique({ where: { cognitoId: admin.sub } });
  if (!adminRow) {
    return NextResponse.json({ error: "Admin record not found." }, { status: 403 });
  }

  try {
    const { account, tempPassword } = await createStaffAccount({
      firstName,
      lastName,
      email,
      phone,
      role,
      createdById: adminRow.id,
    });

    return NextResponse.json({ account, tempPassword });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create staff account." },
      { status: 400 },
    );
  }
}
