import { NextResponse } from "next/server";

import {
  getIdTokenFromRequest,
  unauthorizedResponse,
  type CognitoTokenPayload,
} from "@/lib/api-auth";
import { idTokenVerifier } from "@/lib/cognitoVerifier";

/**
 * Signature-verified drop-in for `requireCognitoAuth(req)` in
 * `lib/api-auth.ts` (which only DECODES the token).
 *
 * Validates the token against Cognito's public keys (signature, `exp`,
 * `aud`, `iss`, token use). Pass `role` to also require the `custom:role`
 * claim to match (a string, or a list of allowed roles).
 *
 *   const auth = await requireVerifiedCognitoAuth(req, "teacher");
 *   if ("error" in auth) return auth.error;
 *   const { payload } = auth;
 *
 * Same return shape as `requireCognitoAuth`, so a route only changes the
 * call (now async). Used by routes that have no "own row" lookup, e.g.
 * onboarding, profile and settings.
 */
export async function requireVerifiedCognitoAuth<
  T extends CognitoTokenPayload = CognitoTokenPayload,
>(
  req: Request,
  role?: string | readonly string[],
): Promise<
  | { token: string; payload: T }
  | { error: ReturnType<typeof NextResponse.json> }
> {
  const token = getIdTokenFromRequest(req);

  if (!token) {
    return { error: unauthorizedResponse() };
  }

  let payload;

  try {
    payload = await idTokenVerifier.verify(token);
  } catch {
    return {
      error: unauthorizedResponse("Invalid or expired session. Please login again."),
    };
  }

  if (role) {
    const allowed = typeof role === "string" ? [role] : role;
    const actual = payload["custom:role"];

    if (typeof actual !== "string" || !allowed.includes(actual)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  return { token, payload: payload as unknown as T };
}
