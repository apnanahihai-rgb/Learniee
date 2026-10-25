import { NextResponse } from "next/server";
import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";

import {
  getStep1FormData,
  saveStep1FormData,
} from "@/features/teacher/server/step1.service";

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedCognitoAuth(req, "teacher");

    if ("error" in auth) {
      return auth.error;
    }

    const cognito = {
      firstName:
        auth.payload.given_name || "",

      lastName:
        auth.payload.family_name || "",

      email:
        auth.payload.email || "",
    };

    const result =
      await getStep1FormData(
        auth.payload.sub,
        cognito
      );

    return NextResponse.json(result);

  } catch (error) {
    console.error(
      "Teacher Step 1 GET Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load teacher information.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(req: Request) {
  try {
    const auth =
      await requireVerifiedCognitoAuth(req, "teacher");

    if ("error" in auth) {
      return auth.error;
    }

    const cognito = {
      email:
        auth.payload.email || "",

      firstName:
        auth.payload.given_name || "",

      lastName:
        auth.payload.family_name || "",
    };

    /*
     * The request may contain:
     *
     * Personal information
     * +
     * profilePhoto metadata
     * +
     * introVideo metadata
     */
    const input =
      await req.json();

    // An IITian must say what they studied at IIT.
    if (
      input.isIITian &&
      (typeof input.iitDegree !== "string" || !input.iitDegree.trim())
    ) {
      return NextResponse.json(
        { error: "Please enter the degree / field you studied at IIT." },
        { status: 400 }
      );
    }

    const teacher =
      await saveStep1FormData(
        auth.payload.sub,
        cognito,
        input
      );

    return NextResponse.json({
      success: true,

      teacherId:
        teacher.id,

      currentStep:
        teacher.currentStep,

      onboardingStatus:
        teacher.onboardingStatus,

      approvalStatus:
        teacher.approvalStatus,
    });

  } catch (error) {
    console.error(
      "Teacher Step 1 POST Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save teacher information.",
      },
      {
        status: 500,
      }
    );
  }
}