import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedCognitoAuth(req, "parent");

  if ("error" in auth) {
    return auth.error;
  }

  const body = await req.json();

  await prisma.parentProfile.update({
    where: { cognitoSub: auth.payload.sub },
    data: { ...body, onboardingComplete: true },
  });

  return NextResponse.json({ success: true });
}
