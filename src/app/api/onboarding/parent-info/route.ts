import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth, type CognitoTokenPayload } from "@/lib/api-auth";

interface ParentInfoTokenPayload extends CognitoTokenPayload {
  phone_number?: string;
}

export async function POST(req: NextRequest) {
  const auth = requireCognitoAuth<ParentInfoTokenPayload>(req);

  if ("error" in auth) {
    return auth.error;
  }

  const { payload } = auth;
  const body = await req.json();

  await prisma.parentProfile.upsert({
    where: { cognitoSub: payload.sub },
    update: body,
    create: {
      cognitoSub: payload.sub,
      email: payload.email,
      firstName: payload.given_name ?? "",
      lastName: payload.family_name ?? "",
      phone: payload.phone_number ?? "",
      ...body,
    },
  });

  return NextResponse.json({ success: true });
}
