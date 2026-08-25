import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtDecode } from "jwt-decode";
import { TeacherApprovalStatus } from "@prisma/client";

interface TokenPayload {
  sub: string;
  email?: string;
  ["custom:role"]?: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    // -----------------------------------------
    // Get teacher ID
    // -----------------------------------------
    const { teacherId } = await params;

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Get Cognito token
    // -----------------------------------------
    const token = req.headers
      .get("cookie")
      ?.match(/idToken=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // -----------------------------------------
    // Decode token
    // -----------------------------------------
    const decoded = jwtDecode<TokenPayload>(token);

    // -----------------------------------------
    // Check admin role
    // -----------------------------------------
    if (decoded["custom:role"] !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // -----------------------------------------
    // Get request body
    // -----------------------------------------
    const body = await req.json();

    const { status } = body;

    // -----------------------------------------
    // Validate approval status
    // -----------------------------------------
    if (
      status !== TeacherApprovalStatus.APPROVED &&
      status !== TeacherApprovalStatus.REJECTED
    ) {
      return NextResponse.json(
        { error: "Invalid approval status" },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Find teacher
    // -----------------------------------------
    const teacher = await prisma.teacher.findUnique({
      where: {
        id: teacherId,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    // -----------------------------------------
    // Update approval status
    // -----------------------------------------
    const updatedTeacher = await prisma.teacher.update({
      where: {
        id: teacherId,
      },

      data: {
        approvalStatus: status,
      },
    });

    return NextResponse.json({
      success: true,
      teacher: updatedTeacher,
    });

  } catch (error) {
    console.error(
      "Teacher approval error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update teacher approval status",
      },
      {
        status: 500,
      }
    );
  }
}