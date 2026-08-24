import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params;

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const { status } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid approval status" },
        { status: 400 }
      );
    }

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
        error: "Failed to update teacher approval status",
      },
      {
        status: 500,
      }
    );
  }
}