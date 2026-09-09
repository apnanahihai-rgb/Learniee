import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api-auth";
import { TeacherApprovalStatus } from "@prisma/client";
import { notifyTeacherApprovalStatus } from "@/features/shared/server/notificationTriggers.service";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

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
    // Auth + admin role check
    // -----------------------------------------
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
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

    await notifyTeacherApprovalStatus(teacherId, status === TeacherApprovalStatus.APPROVED);

    const approved = status === TeacherApprovalStatus.APPROVED;

    await logActivity({
      action: approved ? "TEACHER_APPROVED" : "TEACHER_REJECTED",
      actorRole: "ADMIN",
      ...actorFromTokenPayload(auth.payload),
      description: `Teacher ${updatedTeacher.firstName} ${updatedTeacher.lastName} ${
        approved ? "approved" : "rejected"
      }.`,
      metadata: { teacherId },
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