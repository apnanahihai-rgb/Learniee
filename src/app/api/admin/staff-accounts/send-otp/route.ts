import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/verifyAdmin";
import { generateOtpCode, signOtpChallenge } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/ses";
import { sendOtpSms } from "@/lib/fast2sms";

const OTP_PURPOSE_EMAIL = "staff-account-email";
const OTP_PURPOSE_PHONE = "staff-account-phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/; // E.164

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channel, target } = await req.json();

  if (channel !== "email" && channel !== "phone") {
    return NextResponse.json({ error: "channel must be 'email' or 'phone'." }, { status: 400 });
  }
  if (!target || typeof target !== "string") {
    return NextResponse.json({ error: "target is required." }, { status: 400 });
  }
  if (channel === "email" && !EMAIL_RE.test(target)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  if (channel === "phone" && !PHONE_RE.test(target)) {
    return NextResponse.json(
      { error: "Invalid phone number. Use E.164 format, e.g. +91XXXXXXXXXX." },
      { status: 400 },
    );
  }

  const code = generateOtpCode();
  const purpose = channel === "email" ? OTP_PURPOSE_EMAIL : OTP_PURPOSE_PHONE;
  const challengeToken = signOtpChallenge(target, purpose, code);

  try {
    if (channel === "email") {
      await sendOtpEmail(target, code);
    } else {
      await sendOtpSms(target, code);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send OTP." },
      { status: 502 },
    );
  }

  return NextResponse.json({ challengeToken });
}
