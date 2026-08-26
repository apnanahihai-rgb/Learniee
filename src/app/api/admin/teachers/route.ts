import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/api-auth";
import { createPresignedDownloadUrl } from "@/lib/s3";

export async function GET(req: Request) {
  try {
    const auth = requireAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const teachers = await prisma.teacher.findMany({
      where: {
        approvalStatus: "PENDING",
        onboardingStatus: "COMPLETED",
      },

      include: {
        professionalInfo: true,
        files: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    /*
     * Generate temporary signed URLs for every uploaded file.
     *
     * The S3 bucket is private, so the browser cannot directly
     * access the s3Key. Admin receives a short-lived viewUrl.
     */
    const teachersWithFileUrls = await Promise.all(
      teachers.map(async (teacher) => {
        const files = await Promise.all(
          teacher.files.map(async (file) => ({
            id: file.id,
            type: file.type,
            s3Key: file.s3Key,
            originalFileName: file.originalFileName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,

            viewUrl: await createPresignedDownloadUrl(
              file.s3Key
            ),
          }))
        );

        return {
          ...teacher,
          files,
        };
      })
    );

    return NextResponse.json({
      success: true,
      teachers: teachersWithFileUrls,
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