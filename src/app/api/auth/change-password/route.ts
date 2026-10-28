import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, readCookie } from "@/lib/authCookies";
import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";
import { changeUserPassword, cognitoErrorResponse } from "@/lib/cognitoServer";

/**
 * POST { currentPassword, newPassword }
 *
 * Password change for the logged-in user (Parent / Teacher settings). Needs a
 * valid session (verified ID token) plus the access token cookie Cognito
 * wants for this call; middleware renews both when they have expired.
 */
const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function POST(req: Request) {
  const auth = await requireVerifiedCognitoAuth(req);

  if ("error" in auth) {
    return auth.error;
  }

  const accessToken = readCookie(req, ACCESS_TOKEN_COOKIE);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Your session has expired. Please log out and log back in." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }

  if (!PASSWORD_RULES.test(newPassword)) {
    return NextResponse.json(
      {
        error:
          "New password must be at least 8 characters with an uppercase letter, a lowercase letter and a number.",
      },
      { status: 400 },
    );
  }

  try {
    await changeUserPassword({ accessToken, currentPassword, newPassword });
    return NextResponse.json({ success: true });
  } catch (err) {
    // Wrong current password surfaces as NotAuthorizedException; say so plainly
    // instead of the generic login wording.
    if (err instanceof Error && err.name === "NotAuthorizedException") {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
    }

    return cognitoErrorResponse(err);
  }
}
