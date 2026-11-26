import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/verifyAdmin";
import { checkVerifiedToken } from "@/lib/otp";
import { createStaffAccount, listStaffAccounts } from "@/features/admin/server/staffAccount.service";

// Phone OTP (Fast2SMS) must be verified before an account is created.
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
  const { firstName, lastName, email, phone, role, phoneVerifiedToken } = body;

  if (!firstName || !lastName || !email || !phone || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (role !== "HR" && role !== "ACCOUNTS" && role !== "IT") {
    return NextResponse.json({ error: "Role must be HR, ACCOUNTS or IT." }, { status: 400 });
  }

  if (
    typeof phoneVerifiedToken !== "string" ||
    !checkVerifiedToken(phoneVerifiedToken, String(phone).trim(), OTP_PURPOSE_PHONE)
  ) {
    return NextResponse.json({ error: "Phone number is not verified." }, { status: 400 });
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
