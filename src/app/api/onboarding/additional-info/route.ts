import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";

/**
 * Optional "learning preferences" fields. No longer part of onboarding
 * (which is now a single step) — kept so these can be saved later.
 * Only the fields below are accepted; anything else is ignored.
 */
const ALLOWED_FIELDS = [
  "childStatus",
  "onlineTuition",
  "modeOfCommunication",
  "childInterest",
  "favoriteSubject",
  "weakSubject",
  "preferredLanguage",
  "howDidYouHear",
  "suggestions",
] as const;

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedCognitoAuth(req, "parent");

  if ("error" in auth) {
    return auth.error;
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data: Partial<Record<(typeof ALLOWED_FIELDS)[number], string>> = {};
  for (const field of ALLOWED_FIELDS) {
    const value = body[field];
    if (typeof value === "string") {
      data[field] = value.trim();
    }
  }

  try {
    await prisma.parentProfile.update({
      where: { cognitoSub: auth.payload.sub },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Parent additional-info save error:", err);
    return NextResponse.json({ error: "Failed to save your details." }, { status: 500 });
  }
}
