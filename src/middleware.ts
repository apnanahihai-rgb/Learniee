import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const roleRoutes: Record<string, string> = {
  "/admin": "admin",
  "/teacher": "teacher",
  "/parent": "parent",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const matchedPrefix = Object.keys(roleRoutes).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const token = req.cookies.get("idToken")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const decoded = jwtDecode(token) as { [key: string]: string };
    if (decoded["custom:role"] !== roleRoutes[matchedPrefix]) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/parent/:path*"],
};