import { NextResponse } from "next/server";

import { cognitoErrorResponse, finishForgotPassword } from "@/lib/cognitoServer";

/** POST { email, code, newPassword } - completes the forgot-password flow. */
const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }

  if (!PASSWORD_RULES.test(newPassword)) {
    return NextResponse.json(
      {
        error:
          "Password must be at least 8 characters with an uppercase letter, a lowercase letter and a number.",
      },
      { status: 400 },
    );
  }

  try {
    await finishForgotPassword({ email, code, newPassword });
    return NextResponse.json({ success: true });
  } catch (err) {
    return cognitoErrorResponse(err);
  }
}
