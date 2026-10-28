import { NextResponse } from "next/server";

import { cognitoErrorResponse, startForgotPassword } from "@/lib/cognitoServer";

/** POST { email } - Cognito emails a password-reset code. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
  }

  try {
    await startForgotPassword(email);
    return NextResponse.json({ success: true });
  } catch (err) {
    return cognitoErrorResponse(err);
  }
}
