import { NextResponse } from "next/server";
import { requireCognitoAuth } from "@/lib/api-auth";
import { getStep1FormData, saveStep1FormData } from "@/features/teacher/server/step1.service";

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Used when Step 1 page loads.
|
| Gets firstName, lastName and email from the Cognito ID token
| and loads any existing Teacher information from RDS.
|--------------------------------------------------------------------------
*/

export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const cognito = {
      firstName: auth.payload.given_name || "",
      lastName: auth.payload.family_name || "",
      email: auth.payload.email || "",
    };

    const result = await getStep1FormData(auth.payload.sub, cognito);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Teacher Step 1 GET Error:", error);

    return NextResponse.json(
      { error: "Failed to load teacher information." },
      { status: 500 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Saves Step 1.
|
| IMPORTANT:
| firstName, lastName and email are NOT trusted from the frontend.
| They are always taken from Cognito.
|--------------------------------------------------------------------------
*/

export async function POST(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const cognito = {
      email: auth.payload.email || "",
      firstName: auth.payload.given_name || "",
      lastName: auth.payload.family_name || "",
    };

    const input = await req.json();

    const teacher = await saveStep1FormData(auth.payload.sub, cognito, input);

    return NextResponse.json({
      success: true,
      teacherId: teacher.id,
      currentStep: teacher.currentStep,
      onboardingStatus: teacher.onboardingStatus,
      approvalStatus: teacher.approvalStatus,
    });
  } catch (error) {
    console.error("Teacher Step 1 POST Error:", error);

    return NextResponse.json(
      { error: "Failed to save teacher information." },
      { status: 500 },
    );
  }
}
