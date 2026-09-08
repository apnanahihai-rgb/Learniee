import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth, type CognitoTokenPayload } from "@/lib/api-auth";
import { linkReferralSignup } from "@/features/shared/server/referral.service";

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

  // Refer & Earn — not a ParentProfile column, pull it out before
  // the upsert below (which otherwise spreads `body` straight onto
  // the Prisma model) and handle it separately.
  const { referredByCode, ...profileFields } = body;

  const profile = await prisma.parentProfile.upsert({
    where: { cognitoSub: payload.sub },
    update: profileFields,
    create: {
      cognitoSub: payload.sub,
      email: payload.email,
      firstName: payload.given_name ?? "",
      lastName: payload.family_name ?? "",
      phone: payload.phone_number ?? "",
      ...profileFields,
    },
  });

  if (referredByCode) {
    try {
      await linkReferralSignup({ refereeParentId: profile.id, code: referredByCode });
    } catch (err) {
      // A bad/invalid code (or the rare race) must never fail
      // onboarding itself — linkReferralSignup() already swallows
      // the common cases, this is just a last-resort guard.
      console.error("Referral signup linking failed (onboarding still succeeded):", err);
    }
  }

  return NextResponse.json({ success: true });
}
