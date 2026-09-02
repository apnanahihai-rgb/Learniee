import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/verifyAdmin";
import { verifyOtpChallenge } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { challengeToken, code } = await req.json();

  if (!challengeToken || !code) {
    return NextResponse.json({ error: "challengeToken and code are required." }, { status: 400 });
  }

  const result = verifyOtpChallenge(challengeToken, String(code));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ verifiedToken: result.verifiedToken });
}
