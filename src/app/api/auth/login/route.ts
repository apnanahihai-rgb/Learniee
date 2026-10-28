import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

import {
  clearChallengeCookie,
  setChallengeCookie,
  setSessionCookies,
} from "@/lib/authCookies";
import { cognitoErrorResponse, loginWithPassword } from "@/lib/cognitoServer";

/**
 * POST { email, password }
 *
 * Signs in with Cognito on the server (app client secret) and stores the
 * tokens in httpOnly cookies. Answers `{ success: true, role }`, or
 * `{ challenge: "NEW_PASSWORD_REQUIRED" }` for a staff login that still has a
 * temporary password (the pending challenge is kept in a short-lived httpOnly
 * cookie and finished by `/api/auth/new-password`).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  try {
    const result = await loginWithPassword(email, password);

    if (result.kind === "newPasswordRequired") {
      const res = NextResponse.json({ challenge: "NEW_PASSWORD_REQUIRED" });
      setChallengeCookie(
        res,
        Buffer.from(JSON.stringify({ username: result.username, session: result.session })).toString(
          "base64url",
        ),
      );
      return res;
    }

    const role = jwtDecode<{ "custom:role"?: string }>(result.tokens.idToken)["custom:role"];
    const res = NextResponse.json({ success: true, role: role ?? null });

    setSessionCookies(res, { ...result.tokens, role });
    clearChallengeCookie(res);

    return res;
  } catch (err) {
    return cognitoErrorResponse(err);
  }
}
