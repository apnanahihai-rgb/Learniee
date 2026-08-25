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

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("idToken")?.value;
    if (!token) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const decoded = jwtDecode(token) as DecodedToken;

    const parent = await prisma.parentProfile.findUnique({
      where: { cognitoSub: decoded.sub },
    });

    return NextResponse.json({ onboardingComplete: parent?.onboardingComplete ?? false });
  } catch (error) {
    console.error("Parent onboarding status error:", error);
    return NextResponse.json({ error: "Failed to check parent onboarding status" }, { status: 500 });
  }
}