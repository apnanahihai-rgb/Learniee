import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  try {
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    // -----------------------------------------
    // Get pending teachers
    // -----------------------------------------
    const teachers = await prisma.teacher.findMany({
      where: {
        approvalStatus: "PENDING",

        // Only show teachers who have
        // completed onboarding
        onboardingStatus: "COMPLETED",
      },

      include: {
        professionalInfo: true,

        // S3 files will be available here
        // once S3 integration is implemented.
        files: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      teachers,
    });

  } catch (error) {
    console.error(
      "Admin teachers error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch teachers",
      },
      {
        status: 500,
      }
    );
  }
}