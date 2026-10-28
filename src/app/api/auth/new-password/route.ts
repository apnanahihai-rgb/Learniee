import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  readCookie,
  setSessionCookies,
} from "@/lib/authCookies";
import { cognitoErrorResponse, completeNewPassword } from "@/lib/cognitoServer";

/**
 * POST { newPassword }
 *
 * Second step of the first staff login (temporary password -> real password).
 * The challenge itself comes from the httpOnly cookie `/api/auth/login` set.
 */
const PASSWORD_RULES =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!PASSWORD_RULES.test(newPassword)) {
    return NextResponse.json(
      {
        error:
          "Password must be at least 8 characters with an uppercase letter, a lowercase letter and a number.",
      },
      { status: 400 },
    );
  }

  let challenge: { username?: string; session?: string } | null = null;

  try {
    const raw = readCookie(req, CHALLENGE_COOKIE);
    challenge = raw ? JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) : null;
  } catch {
    challenge = null;
  }

  if (!challenge?.username || !challenge.session) {
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 },
    );
  }

  try {
    const tokens = await completeNewPassword({
      username: challenge.username,
      session: challenge.session,
      newPassword,
    });

    const role = jwtDecode<{ "custom:role"?: string }>(tokens.idToken)["custom:role"];
    const res = NextResponse.json({ success: true, role: role ?? null });

    setSessionCookies(res, { ...tokens, role });
    clearChallengeCookie(res);

    return res;
  } catch (err) {
    return cognitoErrorResponse(err);
  }
}
