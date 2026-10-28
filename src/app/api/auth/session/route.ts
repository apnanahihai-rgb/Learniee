import { NextResponse } from "next/server";

import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";

/**
 * GET - "am I logged in?" for the login page. Verifies the ID token signature
 * (middleware has already renewed an expired session from the refresh token)
 * and answers `{ role }`, or 401. Lets `/login` send an already-logged-in user
 * straight on to their dashboard.
 */
export async function GET(req: Request) {
  const auth = await requireVerifiedCognitoAuth(req);

  if ("error" in auth) {
    return auth.error;
  }

  return NextResponse.json({ role: auth.payload["custom:role"] ?? null });
}
