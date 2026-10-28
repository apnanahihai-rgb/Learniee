import { NextResponse } from "next/server";

import { cognitoErrorResponse, signUpUser } from "@/lib/cognitoServer";

/**
 * POST { email, password, firstName, lastName, phone, role }
 *
 * Self-registration for Parents and Teachers. Cognito then emails a
 * verification code (confirmed via `/api/auth/confirm`).
 *
 * `role` is whitelisted HERE, on the server. Staff roles (admin / accounts /
 * hr / it) can only be created by an Admin through `cognitoAdmin.ts`.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_E164 = /^\+[1-9]\d{6,14}$/;
const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const SELF_SIGNUP_ROLES = new Set(["parent", "teacher"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const role = typeof body?.role === "string" ? body.role : "";

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!PHONE_E164.test(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }

  if (!PASSWORD_RULES.test(password)) {
    return NextResponse.json(
      {
        error:
          "Password must be at least 8 characters with an uppercase letter, a lowercase letter and a number.",
      },
      { status: 400 },
    );
  }

  if (!SELF_SIGNUP_ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
  }

  try {
    await signUpUser({
      email,
      password,
      attributes: {
        given_name: firstName,
        family_name: lastName,
        phone_number: phone,
        "custom:role": role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return cognitoErrorResponse(err);
  }
}
