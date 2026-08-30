import { NextResponse } from "next/server";
import { requireCognitoAuth } from "@/lib/api-auth";
import {
  assertOwnsTeacher,
  saveStep3FormData,
  Step3AuthorizationError,
  Step3NotFoundError,
  type Step3Input,
} from "@/features/teacher/server/step3.service";

export async function POST(req: Request) {
  try {
    const auth = requireCognitoAuth(req);
    if ("error" in auth) {
      return auth.error;
    }

    const data: Step3Input = await req.json();
    const { teacherId } = data;

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID missing." }, { status: 400 });
    }

    await assertOwnsTeacher(auth.payload.sub, teacherId);

    const updatedTeacher = await saveStep3FormData(data);

    return NextResponse.json({
      success: true,
      message: "Teacher onboarding completed successfully.",
      teacherId: updatedTeacher.id,
      currentStep: updatedTeacher.currentStep,
      onboardingStatus: updatedTeacher.onboardingStatus,
      approvalStatus: updatedTeacher.approvalStatus,
    });
  } catch (error) {
    if (error instanceof Step3NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Step3AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Teacher Step 3 Error:", error);
    return NextResponse.json(
      { error: "Failed to complete teacher onboarding." },
      { status: 500 },
    );
  }
}
