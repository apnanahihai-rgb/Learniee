import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type CognitoTokenPayload } from "@/lib/api-auth";
import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";
import { linkReferralSignup } from "@/features/shared/server/referral.service";

interface ParentInfoTokenPayload extends CognitoTokenPayload {
  phone_number?: string;
}

/**
 * Only these ParentProfile fields can be set from this endpoint. Onboarding
 * now sends just a handful, but the rest are allowed so the same route keeps
 * working if more fields are collected up front later. Anything else in the
 * body (e.g. `onboardingComplete`, `email`, `cognitoSub`) is ignored.
 */
const ALLOWED_FIELDS = [
  "visibleName",
  "nriOrIndian",
  "whatsappNumber",
  "country",
  "currency",
  "timezone",
  "nationality",
  "tuitionType",
  "relationToStudent",
  "address",
  "city",
  "pincode",
] as const;

const NRI_OR_INDIAN_VALUES = ["Indian", "NRI"];

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedCognitoAuth<ParentInfoTokenPayload>(req, "parent");

  if ("error" in auth) {
    return auth.error;
  }

  const { payload } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Keep only allowed, non-empty strings so a skipped field never
  // overwrites something already saved.
  const profileFields: Partial<Record<(typeof ALLOWED_FIELDS)[number], string>> = {};
  for (const field of ALLOWED_FIELDS) {
    const value = body[field];
    if (typeof value === "string" && value.trim()) {
      profileFields[field] = value.trim();
    }
  }

  if (!profileFields.visibleName) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }
  if (!profileFields.whatsappNumber) {
    return NextResponse.json({ error: "WhatsApp number is required." }, { status: 400 });
  }
  if (!profileFields.nriOrIndian || !NRI_OR_INDIAN_VALUES.includes(profileFields.nriOrIndian)) {
    return NextResponse.json({ error: "Please select Indian or NRI." }, { status: 400 });
  }
  if (!profileFields.city) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }

  // Refer & Earn — not a ParentProfile column, handled separately below.
  const referredByCode =
    typeof body.referredByCode === "string" ? body.referredByCode.trim() : "";

  try {
    const profile = await prisma.parentProfile.upsert({
      where: { cognitoSub: payload.sub },
      update: { ...profileFields, onboardingComplete: true },
      create: {
        cognitoSub: payload.sub,
        email: payload.email,
        firstName: payload.given_name ?? "",
        lastName: payload.family_name ?? "",
        phone: payload.phone_number ?? "",
        ...profileFields,
        onboardingComplete: true,
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
  } catch (err) {
    console.error("Parent onboarding save error:", err);
    return NextResponse.json({ error: "Failed to save your details." }, { status: 500 });
  }
}
