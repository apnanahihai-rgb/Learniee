import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { prisma } from "@/lib/prisma";

interface DecodedToken {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  phone_number?: string;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("idToken")?.value;
  if (!token) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const decoded = jwtDecode(token) as DecodedToken;
  const body = await req.json();

  await prisma.parentProfile.upsert({
    where: { cognitoSub: decoded.sub },
    update: body,
    create: {
      cognitoSub: decoded.sub,
      email: decoded.email,
      firstName: decoded.given_name ?? "",
      lastName: decoded.family_name ?? "",
      phone: decoded.phone_number ?? "",
      ...body,
    },
  });

  return NextResponse.json({ success: true });
}