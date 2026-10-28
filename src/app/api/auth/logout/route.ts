import { NextResponse } from "next/server";

import {
  REFRESH_TOKEN_COOKIE,
  clearChallengeCookie,
  clearSessionCookies,
  readCookie,
} from "@/lib/authCookies";
import { revokeRefreshToken } from "@/lib/cognitoServer";

/**
 * POST - ends the session: revokes this device's refresh token at Cognito
 * (best effort) and clears every auth cookie. Always answers 200 so logout
 * can never get stuck. The client calls `/api/activity/client-log` (LOGOUT)
 * BEFORE this, while the idToken cookie still identifies the user.
 */
export async function POST(req: Request) {
  const refreshToken = readCookie(req, REFRESH_TOKEN_COOKIE);

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const res = NextResponse.json({ success: true });
  clearSessionCookies(res);
  clearChallengeCookie(res);

  return res;
}
