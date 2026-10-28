import { NextResponse } from "next/server";

import { cognitoErrorResponse, confirmSignUpUser } from "@/lib/cognitoServer";

/** POST { email, code } - confirms the email with the code Cognito sent at sign-up. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }

  try {
    await confirmSignUpUser(email, code);
    return NextResponse.json({ success: true });
  } catch (err) {
    return cognitoErrorResponse(err);
  }
}
