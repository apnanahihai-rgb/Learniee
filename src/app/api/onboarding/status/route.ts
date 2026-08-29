import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const parent = await prisma.parentProfile.findUnique({
      where: { cognitoSub: auth.payload.sub },
    });

    return NextResponse.json({ onboardingComplete: parent?.onboardingComplete ?? false });
  } catch (error) {
    console.error("Parent onboarding status error:", error);
    return NextResponse.json({ error: "Failed to check parent onboarding status" }, { status: 500 });
  }
}
