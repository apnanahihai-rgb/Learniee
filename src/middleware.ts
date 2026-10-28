import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

import {
  ACCESS_TOKEN_COOKIE,
  ID_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from "@/lib/authCookies";
import { isTokenExpired, refreshSessionTokens } from "@/lib/cognitoRefresh";

const roleRoutes: Record<string, string> = {
  "/admin": "admin",
  "/teacher": "teacher",
  "/parent": "parent",
  "/hr": "hr",
  "/it": "it",
  "/accounts": "accounts",
};

/**
 * API routes middleware leaves alone: the unauthenticated auth endpoints (they
 * set their own cookies), payment / payout webhooks (own signature) and cron
 * routes (own secret). Every other /api route passes through so an expired
 * session is renewed BEFORE the route reads the cookie.
 */
const API_PREFIXES_TO_SKIP = [
  "/api/auth/login",
  "/api/auth/new-password",
  "/api/auth/signup",
  "/api/auth/confirm",
  "/api/auth/resend-code",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
  "/api/webhooks/",
  "/api/cron/",
];

interface MiddlewareTokenPayload {
  exp?: number;
  [key: string]: unknown;
}

type Renewed = { idToken: string; accessToken: string };

/** Replaces / adds cookies in a raw `Cookie:` header value. */
function withCookieValues(header: string, values: Record<string, string>): string {
  const kept = header
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !(part.split("=")[0] in values));

  return [...kept, ...Object.entries(values).map(([name, value]) => `${name}=${value}`)].join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi && API_PREFIXES_TO_SKIP.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const matchedPrefix = Object.keys(roleRoutes).find((prefix) => pathname.startsWith(prefix));

  if (!isApi && !matchedPrefix) {
    return NextResponse.next();
  }

  let token = req.cookies.get(ID_TOKEN_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // ---- Session renewal -------------------------------------------------
  // The app client has a secret, so the server can swap the long-lived
  // refresh token for fresh ID / access tokens. Done here so the page or API
  // route that runs next already sees the new cookie (forwarded below) and the
  // browser gets it back as Set-Cookie.
  let renewed: Renewed | null = null;
  let sessionEnded = false;

  if (token && refreshToken && isTokenExpired(token)) {
    const result = await refreshSessionTokens(refreshToken, token);

    if (result.status === "ok") {
      renewed = { idToken: result.idToken, accessToken: result.accessToken };
      token = renewed.idToken;
    } else if (result.status === "invalid") {
      sessionEnded = true;
    }
    // "error" (Cognito unreachable): keep the cookies and let this request
    // fail as an expired session; the next request tries again.
  }

  const finish = (res: NextResponse): NextResponse => {
    if (renewed) setSessionCookies(res, renewed);
    else if (sessionEnded) clearSessionCookies(res);
    return res;
  };

  const next = (): NextResponse => {
    if (!renewed) return NextResponse.next();

    // Pass the new tokens on to whatever handles this request.
    const headers = new Headers(req.headers);
    headers.set(
      "cookie",
      withCookieValues(req.headers.get("cookie") ?? "", {
        [ID_TOKEN_COOKIE]: renewed.idToken,
        [ACCESS_TOKEN_COOKIE]: renewed.accessToken,
      }),
    );

    return finish(NextResponse.next({ request: { headers } }));
  };

  // ---- API routes: renewal only; every route does its own auth. -------
  if (isApi) {
    return sessionEnded ? finish(NextResponse.next()) : next();
  }

  // ---- Pages -----------------------------------------------------------
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const decoded = jwtDecode<MiddlewareTokenPayload>(token);

    // This still only decodes the JWT - it does not verify the Cognito
    // signature (see 06-OPEN-DECISIONS.md #21). What it does catch: an
    // EXPIRED token that could not be renewed above goes to /session-expired
    // instead of keeping route access forever.
    if (typeof decoded.exp !== "number" || decoded.exp * 1000 <= Date.now()) {
      return finish(NextResponse.redirect(new URL("/session-expired", req.url)));
    }

    // Logged in, but with a different role than this area needs.
    if (decoded["custom:role"] !== roleRoutes[matchedPrefix!]) {
      return finish(NextResponse.redirect(new URL("/access-denied", req.url)));
    }
  } catch {
    // Unreadable token cookie: treat as an expired/invalid session.
    return finish(NextResponse.redirect(new URL("/session-expired", req.url)));
  }

  return next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/parent/:path*",
    "/hr/:path*",
    "/it/:path*",
    "/accounts/:path*",
    "/api/:path*",
  ],
};
