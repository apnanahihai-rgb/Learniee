import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  UPLOAD_FOLDERS,
  UploadFolder,
  buildS3Key,
  createPresignedUploadUrl,
} from "@/lib/s3";

interface DecodedToken {
  sub: string;
}

const FOLDER_VALUES = Object.values(UPLOAD_FOLDERS);

function isUploadFolder(value: unknown): value is UploadFolder {
  return (
    typeof value === "string" &&
    (FOLDER_VALUES as string[]).includes(value)
  );
}

/**
 * Issues a short-lived, presigned S3 PUT URL so the browser can
 * upload the file bytes directly to S3 (bypassing this server, so
 * we never buffer up to 50MB files in a route handler).
 *
 * Body: { folder, fileName, contentType, teacherId? }
 * - folder: "teacher-documents" | "child-photos"
 * - teacherId: required for teacher-documents (matches the existing
 *   onboarding flow, which identifies the teacher via a client-held
 *   teacherId rather than a session)
 * - child-photos instead identifies the owner via the parent's
 *   session cookie, so it can't be spoofed by passing someone
 *   else's id.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folder, fileName, contentType, teacherId } = body ?? {};

    if (!isUploadFolder(folder)) {
      return NextResponse.json(
        { error: "Invalid or missing folder" },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 }
      );
    }

    if (
      !contentType ||
      !ALLOWED_UPLOAD_MIME_TYPES.includes(contentType)
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Only PNG, JPG, and PDF are allowed.",
        },
        { status: 400 }
      );
    }

    let ownerId: string;

    if (folder === UPLOAD_FOLDERS.TEACHER_DOCUMENTS) {
      if (!teacherId || typeof teacherId !== "string") {
        return NextResponse.json(
          { error: "teacherId is required for document uploads" },
          { status: 400 }
        );
      }

      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 }
        );
      }

      ownerId = teacher.id;
    } else {
      // child-photos: identify the parent from their session cookie,
      // never from a client-supplied id.
      const token = req.cookies.get("idToken")?.value;

      if (!token) {
        return NextResponse.json(
          { error: "Not logged in" },
          { status: 401 }
        );
      }

      const decoded = jwtDecode(token) as DecodedToken;

      const parent = await prisma.parentProfile.findUnique({
        where: { cognitoSub: decoded.sub },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "Complete step 1 first" },
          { status: 400 }
        );
      }

      ownerId = parent.id;
    }

    const key = buildS3Key(folder, ownerId, fileName);
    const uploadUrl = await createPresignedUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Presign upload error:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
