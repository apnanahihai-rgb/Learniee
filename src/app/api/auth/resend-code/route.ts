import { NextResponse } from "next/server";

import { cognitoErrorResponse, resendSignUpCode } from "@/lib/cognitoServer";

/** POST { email } - sends a new sign-up verification code. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    await resendSignUpCode(email);
    return NextResponse.json({ success: true });
  } catch (err) {
    return cognitoErrorResponse(err);
  }
}
