import type { NextResponse } from "next/server";

/**
 * Session cookies for the traditional-web-app Cognito flow.
 *
 *   idToken        httpOnly  - read by middleware + every API route (name unchanged)
 *   accessToken    httpOnly  - only used to change the password
 *   refreshToken   httpOnly  - lets middleware silently renew the two above
 *   viewerRole     readable  - NON-sensitive hint ("parent", "teacher", ...) so
 *                              client UI can tell "logged in?" without the token.
 *                              UI only: never used for access decisions.
 *
 * The tokens are never readable from JavaScript, so a script injected into the
 * page can no longer steal a session.
 *
 * Env:
 *   AUTH_SESSION_DAYS     cookie lifetime in days (default 30 - keep it equal to
 *                         the app client's refresh-token validity)
 *   AUTH_COOKIE_SECURE    "true" / "false" to override the Secure flag
 *                         (default: Secure in production, off in `next dev`)
 */
export const ID_TOKEN_COOKIE = "idToken";
export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";
export const VIEWER_ROLE_COOKIE = "viewerRole";
export const CHALLENGE_COOKIE = "authChallenge";

export const CHALLENGE_COOKIE_PATH = "/api/auth";
const CHALLENGE_MAX_AGE_SECONDS = 180; // Cognito's challenge session lasts 3 minutes.

function sessionMaxAgeSeconds(): number {
  const days = Number(process.env.AUTH_SESSION_DAYS);
  return (Number.isFinite(days) && days > 0 ? days : 30) * 24 * 60 * 60;
}

function secureFlag(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production";
}

export interface SessionTokens {
  idToken: string;
  accessToken: string;
  /** Not returned by a refresh call - the existing cookie is kept then. */
  refreshToken?: string;
  /** Value for the readable `viewerRole` hint cookie. */
  role?: string;
}

export function setSessionCookies(res: NextResponse, tokens: SessionTokens): void {
  const maxAge = sessionMaxAgeSeconds();
  const base = { path: "/", sameSite: "lax" as const, secure: secureFlag(), maxAge };

  res.cookies.set(ID_TOKEN_COOKIE, tokens.idToken, { ...base, httpOnly: true });
  res.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, { ...base, httpOnly: true });

  if (tokens.refreshToken) {
    res.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, { ...base, httpOnly: true });
  }

  if (tokens.role) {
    res.cookies.set(VIEWER_ROLE_COOKIE, tokens.role, { ...base, httpOnly: false });
  }
}

export function clearSessionCookies(res: NextResponse): void {
  for (const name of [
    ID_TOKEN_COOKIE,
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    VIEWER_ROLE_COOKIE,
  ]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

/** Short-lived cookie carrying a pending NEW_PASSWORD_REQUIRED challenge. */
export function setChallengeCookie(res: NextResponse, value: string): void {
  res.cookies.set(CHALLENGE_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureFlag(),
    path: CHALLENGE_COOKIE_PATH,
    maxAge: CHALLENGE_MAX_AGE_SECONDS,
  });
}

export function clearChallengeCookie(res: NextResponse): void {
  res.cookies.set(CHALLENGE_COOKIE, "", { path: CHALLENGE_COOKIE_PATH, maxAge: 0 });
}

/** Reads one cookie out of a raw `Cookie:` request header. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      const value = part.slice(index + 1).trim();

      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return undefined;
}
