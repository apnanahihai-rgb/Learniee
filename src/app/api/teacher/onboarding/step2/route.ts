import { NextResponse } from "next/server";
import { requireCognitoAuth } from "@/lib/api-auth";
import {
  getTeacherWithProfessionalInfo,
  saveStep2FormData,
  type Step2FormInput,
} from "@/features/teacher/server/step2.service";

/**
 * GET — used when the Step 2 page loads. Returns teacher info,
 * professional info, and existing certifications/awards.
 */
export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);
    if ("error" in auth) {
      return auth.error;
    }

    const teacher = await getTeacherWithProfessionalInfo(auth.payload.sub);

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    }

    const certifications = teacher.files.filter((file) => file.type === "CERTIFICATION");
    const awards = teacher.files.filter((file) => file.type === "AWARD");

    return NextResponse.json({
      success: true,
      teacherId: teacher.id,
      currentStep: teacher.currentStep,
      onboardingStatus: teacher.onboardingStatus,
      approvalStatus: teacher.approvalStatus,
      professionalInfo: teacher.professionalInfo,
      files: { certifications, awards },
    });
  } catch (error) {
    console.error("Teacher Step 2 GET Error:", error);
    return NextResponse.json(
      { error: "Failed to load professional information." },
      { status: 500 },
    );
  }
}

/**
 * POST — saves Step 2 professional information plus any uploaded
 * certification/award file metadata.
 */
export async function POST(req: Request) {
  try {
    const auth = requireCognitoAuth(req);
    if ("error" in auth) {
      return auth.error;
    }

    const body = await req.json();
    const { teacherId, ...input }: { teacherId: string } & Step2FormInput = body;

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID missing." }, { status: 400 });
    }

    const teacher = await getTeacherWithProfessionalInfo(auth.payload.sub);

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    }

    // Security check: the teacherId supplied by the browser must belong
    // to the currently authenticated Cognito user.
    if (teacher.id !== teacherId) {
      return NextResponse.json(
        { error: "You are not authorized to update this teacher." },
        { status: 403 },
      );
    }

    const professionalInfo = await saveStep2FormData(teacher.id, input);

    return NextResponse.json({
      success: true,
      teacherId: teacher.id,
      currentStep: 2,
      onboardingStatus: "IN_PROGRESS",
      approvalStatus: teacher.approvalStatus,
      data: professionalInfo,
    });
  } catch (error) {
    console.error("Teacher Step 2 POST Error:", error);
    return NextResponse.json(
      { error: "Failed to save professional information." },
      { status: 500 },
    );
  }
}
