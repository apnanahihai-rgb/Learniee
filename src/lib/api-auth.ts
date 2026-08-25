import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

/**
 * Shape of the Cognito ID token payload.
 * Individual routes can widen this via a generic if they need
 * extra claims (e.g. "custom:role", given_name, family_name).
 */
export interface CognitoTokenPayload {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  "custom:role"?: string;
}

/**
 * Extracts the raw Cognito ID token string from the request's
 * "idToken" cookie. Returns undefined if the cookie is missing.
 */
export function getIdTokenFromRequest(req: Request): string | undefined {
  return req.headers.get("cookie")?.match(/idToken=([^;]+)/)?.[1];
}

/**
 * Standard "unauthorized" JSON response used whenever the ID token
 * is missing or fails to decode.
 */
export function unauthorizedResponse(message = "Unauthorized. Please login again.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Reads and decodes the Cognito ID token from the request.
 *
 * Returns `{ token, payload }` on success, or `{ error }` (a ready-to-return
 * NextResponse) if the token is missing/invalid. This lets route handlers
 * do:
 *
 *   const auth = requireCognitoAuth(req);
 *   if ("error" in auth) return auth.error;
 *   const { payload } = auth;
 */
export function requireCognitoAuth<T extends CognitoTokenPayload = CognitoTokenPayload>(
  req: Request,
):
  | { token: string; payload: T }
  | { error: ReturnType<typeof NextResponse.json> } {
  const token = getIdTokenFromRequest(req);

  if (!token) {
    return { error: unauthorizedResponse() };
  }

  try {
    const payload = jwtDecode<T>(token);

    if (!payload.sub) {
      return { error: unauthorizedResponse("Invalid Cognito token.") };
    }

    return { token, payload };
  } catch {
    return { error: unauthorizedResponse("Invalid Cognito token.") };
  }
}

/**
 * Same as requireCognitoAuth, but additionally requires the
 * "custom:role" claim to equal "admin". Used by admin-only routes.
 */
export function requireAdminAuth(req: Request):
  | { token: string; payload: CognitoTokenPayload }
  | { error: ReturnType<typeof NextResponse.json> } {
  const auth = requireCognitoAuth(req);

  if ("error" in auth) {
    return auth;
  }

  if (auth.payload["custom:role"] !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}
