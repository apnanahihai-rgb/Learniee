import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
  email?: string;
}

export async function POST(req: Request) {
  try {
    // Get Cognito ID token from cookie
    const token = req.headers
      .get("cookie")
      ?.match(/idToken=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Please login again." },
        { status: 401 }
      );
    }

    // Decode Cognito token
    const decoded = jwtDecode<TokenPayload>(token);

    if (!decoded.sub) {
      return NextResponse.json(
        { error: "Invalid Cognito token." },
        { status: 401 }
      );
    }

    const data = await req.json();

    const {
  email,
  password,
  firstName,
  lastName,
  dobDay,
  dobMonth,
  dobYear,
  ...personalData
} = data;

    // Password belongs to Cognito.
    // Do NOT store it in RDS.

    // Check whether this Cognito user already has a Teacher record
    const existingTeacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: decoded.sub,
      },
    });

    let teacher;

    if (existingTeacher) {
      // Update existing Teacher record
      teacher = await prisma.teacher.update({
        where: {
          cognitoId: decoded.sub,
        },
        data: {
          email,
          firstName,
          lastName,
          ...personalData,
        },
      });
    } else {
      // Create new Teacher record
      teacher = await prisma.teacher.create({
  data: {
    cognitoId: decoded.sub,
    email,
    firstName,
    lastName,

    ...personalData,

    dobDay: dobDay ? Number(dobDay) : null,
    dobMonth: dobMonth || null,
    dobYear: dobYear ? Number(dobYear) : null,

    onboardingComplete: false,
    approvalStatus: "PENDING",
  },
});
    }

    return NextResponse.json({
      success: true,
      teacherId: teacher.id,
    });
  } catch (error) {
    console.error("Teacher Step 1 Error:", error);

    return NextResponse.json(
      { error: "Failed to save teacher information" },
      { status: 500 }
    );
  }
}