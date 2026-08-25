import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
}

function getToken(req: Request) {
  return req.headers
    .get("cookie")
    ?.match(/idToken=([^;]+)/)?.[1];
}

/**
 * GET
 *
 * Used when Step 2 page loads.
 * Fetches the logged-in teacher's existing professional information.
 */
export async function GET(req: Request) {
  try {
    const token = getToken(req);

    if (!token) {
      return NextResponse.json(
        {
          error: "Unauthorized. Please login again.",
        },
        {
          status: 401,
        }
      );
    }

    const decoded = jwtDecode<TokenPayload>(token);

    if (!decoded.sub) {
      return NextResponse.json(
        {
          error: "Invalid Cognito token.",
        },
        {
          status: 401,
        }
      );
    }

    // Find teacher using Cognito ID
    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: decoded.sub,
      },
      include: {
        professionalInfo: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        {
          error: "Teacher not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,

      teacherId: teacher.id,

      currentStep: teacher.currentStep,

      onboardingStatus: teacher.onboardingStatus,

      approvalStatus: teacher.approvalStatus,

      professionalInfo: teacher.professionalInfo,
    });
  } catch (error) {
    console.error(
      "Teacher Step 2 GET Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load professional information.",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST
 *
 * Saves Step 2 professional information.
 */
export async function POST(req: Request) {
  try {
    const token = getToken(req);

    if (!token) {
      return NextResponse.json(
        {
          error: "Unauthorized. Please login again.",
        },
        {
          status: 401,
        }
      );
    }

    const decoded = jwtDecode<TokenPayload>(token);

    if (!decoded.sub) {
      return NextResponse.json(
        {
          error: "Invalid Cognito token.",
        },
        {
          status: 401,
        }
      );
    }

    const data = await req.json();

    const {
      teacherId,

      referredBy,
      qualifications,
      overallExperience,
      comfortableLanguage,
      schoolsTaught,

      workingInSchool,
      schoolName,

      workingInAcademy,
      academyName,

      homeTuitionArea,
      studentsTaught,
      canTakeHomeTuition,
      hoursPerDay,

      haveOwnNotes,
      canMakePresentations,
      provideHomework,
      conductPTM,

      hasLaptop,
      hasPenTab,
      proficientInEnglish,

      additionalInfo,

      facebook,
      linkedin,
      instagram,
      youtube,

      notWithOtherAcademy,
    } = data;

    if (!teacherId) {
      return NextResponse.json(
        {
          error: "Teacher ID missing.",
        },
        {
          status: 400,
        }
      );
    }

    // Find logged-in teacher
    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: decoded.sub,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        {
          error: "Teacher not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Security check:
    // Make sure the teacherId sent by frontend
    // belongs to the logged-in Cognito user.
    if (teacher.id !== teacherId) {
      return NextResponse.json(
        {
          error: "You are not authorized to update this teacher.",
        },
        {
          status: 403,
        }
      );
    }

    // Save / update professional information
    const professionalInfo =
      await prisma.teacherProfessional.upsert({
        where: {
          teacherId: teacher.id,
        },

        update: {
          referredBy: referredBy || null,
          qualifications: qualifications || null,
          overallExperience: overallExperience || null,
          comfortableLanguage:
            comfortableLanguage || null,
          schoolsTaught: schoolsTaught || null,

          workingInSchool:
            Boolean(workingInSchool),

          schoolName:
            workingInSchool
              ? schoolName || null
              : null,

          workingInAcademy:
            Boolean(workingInAcademy),

          academyName:
            workingInAcademy
              ? academyName || null
              : null,

          homeTuitionArea:
            homeTuitionArea || null,

          studentsTaught:
            studentsTaught || null,

          canTakeHomeTuition:
            canTakeHomeTuition || null,

          hoursPerDay:
            hoursPerDay || null,

          haveOwnNotes:
            haveOwnNotes || null,

          canMakePresentations:
            canMakePresentations || null,

          provideHomework:
            provideHomework || null,

          conductPTM:
            conductPTM || null,

          hasLaptop:
            Boolean(hasLaptop),

          hasPenTab:
            Boolean(hasPenTab),

          proficientInEnglish:
            Boolean(proficientInEnglish),

          additionalInfo:
            additionalInfo || null,

          facebook:
            facebook || null,

          linkedin:
            linkedin || null,

          instagram:
            instagram || null,

          youtube:
            youtube || null,

          notWithOtherAcademy:
            Boolean(notWithOtherAcademy),
        },

        create: {
          teacherId: teacher.id,

          referredBy: referredBy || null,
          qualifications: qualifications || null,
          overallExperience: overallExperience || null,
          comfortableLanguage:
            comfortableLanguage || null,
          schoolsTaught: schoolsTaught || null,

          workingInSchool:
            Boolean(workingInSchool),

          schoolName:
            workingInSchool
              ? schoolName || null
              : null,

          workingInAcademy:
            Boolean(workingInAcademy),

          academyName:
            workingInAcademy
              ? academyName || null
              : null,

          homeTuitionArea:
            homeTuitionArea || null,

          studentsTaught:
            studentsTaught || null,

          canTakeHomeTuition:
            canTakeHomeTuition || null,

          hoursPerDay:
            hoursPerDay || null,

          haveOwnNotes:
            haveOwnNotes || null,

          canMakePresentations:
            canMakePresentations || null,

          provideHomework:
            provideHomework || null,

          conductPTM:
            conductPTM || null,

          hasLaptop:
            Boolean(hasLaptop),

          hasPenTab:
            Boolean(hasPenTab),

          proficientInEnglish:
            Boolean(proficientInEnglish),

          additionalInfo:
            additionalInfo || null,

          facebook:
            facebook || null,

          linkedin:
            linkedin || null,

          instagram:
            instagram || null,

          youtube:
            youtube || null,

          notWithOtherAcademy:
            Boolean(notWithOtherAcademy),
        },
      });

    // Mark Step 2 as completed
    await prisma.teacher.update({
      where: {
        id: teacher.id,
      },

      data: {
        currentStep: 2,
        onboardingStatus: "IN_PROGRESS",
      },
    });

    return NextResponse.json({
      success: true,

      teacherId: teacher.id,

      currentStep: 2,

      onboardingStatus:
        "IN_PROGRESS",

      approvalStatus:
        teacher.approvalStatus,

      data: professionalInfo,
    });
  } catch (error) {
    console.error(
      "Teacher Step 2 POST Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save professional information.",
      },
      {
        status: 500,
      }
    );
  }
}