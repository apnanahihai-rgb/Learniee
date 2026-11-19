import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";
import { getTeacherRatingSummary } from "@/features/shared/server/review.service";

const PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  visibleName: true,
  email: true,
  phone: true,
  whatsapp: true,
  address: true,
  city: true,
  country: true,
  pincode: true,
  aboutMe: true,
  approvalStatus: true,
  isIITian: true,
  createdAt: true,
  // Qualification / experience live on the onboarding "professional" row.
  professionalInfo: {
    select: { qualifications: true, overallExperience: true },
  },
} as const;

/** Flattens the professional row so the client gets plain fields. */
function shapeTeacher<T extends { professionalInfo: { qualifications: string | null; overallExperience: string | null } | null }>(
  teacher: T,
) {
  const { professionalInfo, ...rest } = teacher;
  return {
    ...rest,
    qualifications: professionalInfo?.qualifications ?? null,
    overallExperience: professionalInfo?.overallExperience ?? null,
  };
}

/**
 * GET
 *
 * Originally just name/email for TeacherNavbar/`/teacher`. Widened
 * (Sep 10, 2026) to also back the new `/teacher/profile` page — the
 * navbar's fetch simply ignores the extra fields it doesn't use.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedCognitoAuth(req, "teacher");

    if ("error" in auth) {
      return auth.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: auth.payload.sub,
      },
      select: PROFILE_SELECT,
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const rating = await getTeacherRatingSummary(teacher.id);

    return NextResponse.json({
      teacher: {
        ...shapeTeacher(teacher),
        averageRating: rating.averageRating,
        reviewCount: rating.totalReviews,
      },
    });

  } catch (error) {
    console.error(
      "Teacher profile error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH
 *
 * Self-service edit for the new `/teacher/profile` page. Only the
 * "contact card" fields — display name, contact details, address,
 * bio — same reasoning as the Parent profile route: onboarding-only
 * fields (`dobDay`/`dobMonth`/`dobYear`, `gender`, `nationality`,
 * `panCardNumber`, `criminalCase`) stay scoped to the onboarding
 * flow, and `email`/`approvalStatus` are never editable here (email
 * is the Cognito-linked identity field; approvalStatus is Admin-only,
 * see `/admin/teachers`).
 */
const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "visibleName",
  "phone",
  "whatsapp",
  "address",
  "city",
  "country",
  "pincode",
  "aboutMe",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];
// Stored on TeacherProfessional (set at onboarding), editable from Account > Profile.
const PROFESSIONAL_FIELDS = ["qualifications", "overallExperience"] as const;
type ProfessionalField = (typeof PROFESSIONAL_FIELDS)[number];
type ProfileUpdateBody = Partial<Record<EditableField | ProfessionalField, string>>;

export async function PATCH(req: Request) {
  try {
    const auth = await requireVerifiedCognitoAuth(req, "teacher");

    if ("error" in auth) {
      return auth.error;
    }

    const body = (await req.json()) as ProfileUpdateBody;

    const data: Partial<Record<EditableField, string>> = {};
    for (const field of EDITABLE_FIELDS) {
      if (typeof body[field] === "string") {
        data[field] = body[field]!.trim();
      }
    }

    const professional: Partial<Record<ProfessionalField, string>> = {};
    for (const field of PROFESSIONAL_FIELDS) {
      if (typeof body[field] === "string") {
        professional[field] = body[field]!.trim().slice(0, 300);
      }
    }

    if (data.firstName === "" || data.lastName === "") {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 },
      );
    }

    const teacher = await prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.update({
        where: { cognitoId: auth.payload.sub },
        data,
        select: { id: true },
      });

      if (Object.keys(professional).length > 0) {
        await tx.teacherProfessional.upsert({
          where: { teacherId: updated.id },
          create: { teacherId: updated.id, ...professional },
          update: professional,
        });
      }

      return tx.teacher.findUniqueOrThrow({
        where: { id: updated.id },
        select: PROFILE_SELECT,
      });
    });

    return NextResponse.json({ teacher: shapeTeacher(teacher) });
  } catch (error) {
    console.error("Teacher profile update error:", error);

    return NextResponse.json(
      { error: "Failed to update your profile." },
      { status: 500 },
    );
  }
}
