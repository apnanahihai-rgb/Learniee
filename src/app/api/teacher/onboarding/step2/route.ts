import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const { teacherId, ...professionalData } = data;

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID missing" },
        { status: 400 }
      );
    }

    // Make sure the teacher exists
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

    const professionalInfo =
      await prisma.teacherProfessional.upsert({
        where: {
          teacherId,
        },

        update: {
          ...professionalData,
        },

        create: {
          teacherId,
          ...professionalData,
        },
      });

    return NextResponse.json({
      success: true,
      data: professionalInfo,
    });
  } catch (error) {
    console.error("Teacher Step 2 Error:", error);

    return NextResponse.json(
      { error: "Failed to save professional information" },
      { status: 500 }
    );
  }
}