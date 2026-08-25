import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Used when Step 1 page loads.
|
| Gets firstName, lastName and email from Cognito ID token
| and loads any existing Teacher information from RDS.
|--------------------------------------------------------------------------
*/

export async function GET(req: Request) {
  try {
    const token = req.headers
      .get("cookie")
      ?.match(/idToken=([^;]+)/)?.[1];

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

    /*
    |--------------------------------------------------------------------------
    | Cognito information
    |--------------------------------------------------------------------------
    */

    const cognitoData = {
      firstName: decoded.given_name || "",
      lastName: decoded.family_name || "",
      email: decoded.email || "",
    };

    /*
    |--------------------------------------------------------------------------
    | Check whether Teacher already exists in RDS
    |--------------------------------------------------------------------------
    */

    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: decoded.sub,
      },
      select: {
        id: true,

        firstName: true,
        lastName: true,
        email: true,

        visibleName: true,

        dobDay: true,
        dobMonth: true,
        dobYear: true,

        gender: true,
        nationality: true,

        address: true,
        city: true,
        country: true,
        pincode: true,

        phone: true,
        whatsapp: true,

        aboutMe: true,
        criminalCase: true,

        currentStep: true,
        onboardingStatus: true,
        approvalStatus: true,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | No Teacher record yet
    |--------------------------------------------------------------------------
    */

    if (!teacher) {
      return NextResponse.json({
        exists: false,

        teacherId: null,

        formData: {
          ...cognitoData,

          visibleName: "",

          dobDay: "",
          dobMonth: "",
          dobYear: "",

          gender: "",
          nationality: "",

          address: "",
          city: "",
          country: "",
          pincode: "",

          phone: "",
          whatsapp: "",

          aboutMe: "",
          criminalCase: "",
        },

        currentStep: 0,
        onboardingStatus: "NOT_STARTED",
        approvalStatus: null,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Teacher already exists
    |--------------------------------------------------------------------------
    |
    | Use RDS data for all editable fields.
    |
    | For firstName, lastName and email:
    | Cognito remains the source of truth.
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      exists: true,

      teacherId: teacher.id,

      formData: {
        firstName: cognitoData.firstName,
        lastName: cognitoData.lastName,
        email: cognitoData.email,

        visibleName: teacher.visibleName || "",

        dobDay:
          teacher.dobDay !== null
            ? String(teacher.dobDay)
            : "",

        dobMonth: teacher.dobMonth || "",

        dobYear:
          teacher.dobYear !== null
            ? String(teacher.dobYear)
            : "",

        gender: teacher.gender || "",
        nationality: teacher.nationality || "",

        address: teacher.address || "",
        city: teacher.city || "",
        country: teacher.country || "",
        pincode: teacher.pincode || "",

        phone: teacher.phone || "",
        whatsapp: teacher.whatsapp || "",

        aboutMe: teacher.aboutMe || "",
        criminalCase: teacher.criminalCase || "",
      },

      currentStep: teacher.currentStep,
      onboardingStatus: teacher.onboardingStatus,
      approvalStatus: teacher.approvalStatus,
    });
  } catch (error) {
    console.error(
      "Teacher Step 1 GET Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load teacher information.",
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
| Saves Step 1.
|
| IMPORTANT:
| firstName, lastName and email are NOT trusted from frontend.
| They are always taken from Cognito.
|--------------------------------------------------------------------------
*/

export async function POST(req: Request) {
  try {
    const token = req.headers
      .get("cookie")
      ?.match(/idToken=([^;]+)/)?.[1];

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

    /*
    |--------------------------------------------------------------------------
    | Cognito is source of truth
    |--------------------------------------------------------------------------
    */

    const email = decoded.email || "";
    const firstName = decoded.given_name || "";
    const lastName = decoded.family_name || "";

    const {
      visibleName,
      dobDay,
      dobMonth,
      dobYear,
      gender,
      nationality,
      address,
      city,
      country,
      pincode,
      phone,
      whatsapp,
      aboutMe,
      criminalCase,
    } = data;

    /*
    |--------------------------------------------------------------------------
    | Check existing Teacher
    |--------------------------------------------------------------------------
    */

    const existingTeacher =
      await prisma.teacher.findUnique({
        where: {
          cognitoId: decoded.sub,
        },
      });

    let teacher;

    if (existingTeacher) {
      teacher = await prisma.teacher.update({
        where: {
          cognitoId: decoded.sub,
        },

        data: {
          // Cognito values
          email,
          firstName,
          lastName,

          // User entered values
          visibleName,

          dobDay: dobDay
            ? Number(dobDay)
            : null,

          dobMonth:
            dobMonth || null,

          dobYear: dobYear
            ? Number(dobYear)
            : null,

          gender,
          nationality,

          address,
          city,
          country,
          pincode,

          phone,
          whatsapp,

          aboutMe,
          criminalCase,

          currentStep: 2,
          onboardingStatus: "IN_PROGRESS",
        },
      });
    } else {
      teacher = await prisma.teacher.create({
        data: {
          cognitoId: decoded.sub,

          // Cognito values
          email,
          firstName,
          lastName,

          // User entered values
          visibleName,

          dobDay: dobDay
            ? Number(dobDay)
            : null,

          dobMonth:
            dobMonth || null,

          dobYear: dobYear
            ? Number(dobYear)
            : null,

          gender,
          nationality,

          address,
          city,
          country,
          pincode,

          phone,
          whatsapp,

          aboutMe,
          criminalCase,

          currentStep: 2,
          onboardingStatus: "IN_PROGRESS",
          approvalStatus: "PENDING",
        },
      });
    }

    return NextResponse.json({
      success: true,
      teacherId: teacher.id,
      currentStep: teacher.currentStep,
      onboardingStatus: teacher.onboardingStatus,
      approvalStatus: teacher.approvalStatus,
    });
  } catch (error) {
    console.error(
      "Teacher Step 1 POST Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to save teacher information.",
      },
      {
        status: 500,
      }
    );
  }
}