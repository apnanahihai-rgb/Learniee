import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";

/**
 * GET
 *
 * Originally just name/email for the ParentNavbar. Widened (Sep 10,
 * 2026) to also back the new `/parent/profile` page — still the same
 * single endpoint rather than a second one, since the navbar's fetch
 * simply ignores the extra fields it doesn't use.
 */
export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const parent = await prisma.parentProfile.findUnique({
      where: {
        cognitoSub: auth.payload.sub,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visibleName: true,
        email: true,
        phone: true,
        whatsappNumber: true,
        address: true,
        city: true,
        country: true,
        pincode: true,
        preferredLanguage: true,
        modeOfCommunication: true,
        createdAt: true,
      },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Parent profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      parent,
    });
  } catch (error) {
    console.error("Parent profile error:", error);

    return NextResponse.json(
      { error: "Failed to fetch parent profile" },
      { status: 500 },
    );
  }
}

/**
 * PATCH
 *
 * Self-service edit for the new `/parent/profile` page. Deliberately
 * only touches the "contact card" fields — display name, contact
 * details, address, communication preference — not the
 * onboarding-only fields (`tuitionType`, `relationToStudent`,
 * `favoriteSubject`, etc.), which stay scoped to the onboarding flow
 * (`useParentStep1Form`/`useParentStep2Form`) rather than being
 * re-editable from two different places. `email`/`cognitoSub` are
 * never editable here — email is the Cognito-linked unique identity
 * field (`03-DATA-MODEL.md`'s "Any Cognito-linked entity stores the
 * Cognito sub" convention), changing it would desync login from
 * profile.
 */
const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "visibleName",
  "phone",
  "whatsappNumber",
  "address",
  "city",
  "country",
  "pincode",
  "preferredLanguage",
  "modeOfCommunication",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];
type ProfileUpdateBody = Partial<Record<EditableField, string>>;

export async function PATCH(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const body = (await req.json()) as ProfileUpdateBody;

    const data: ProfileUpdateBody = {};
    for (const field of EDITABLE_FIELDS) {
      if (typeof body[field] === "string") {
        data[field] = body[field]!.trim();
      }
    }

    if (data.firstName === "" || data.lastName === "" || data.phone === "") {
      return NextResponse.json(
        { error: "First name, last name, and phone number are required." },
        { status: 400 },
      );
    }

    const parent = await prisma.parentProfile.update({
      where: { cognitoSub: auth.payload.sub },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visibleName: true,
        email: true,
        phone: true,
        whatsappNumber: true,
        address: true,
        city: true,
        country: true,
        pincode: true,
        preferredLanguage: true,
        modeOfCommunication: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ parent });
  } catch (error) {
    console.error("Parent profile update error:", error);

    return NextResponse.json(
      { error: "Failed to update your profile." },
      { status: 500 },
    );
  }
}
