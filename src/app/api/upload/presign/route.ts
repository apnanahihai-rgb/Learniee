import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

import { prisma } from "@/lib/prisma";

import {
  ALLOWED_UPLOAD_MIME_TYPES,
  UPLOAD_FOLDERS,
  type UploadFolder,
  buildS3Key,
  createPresignedUploadUrl,
} from "@/lib/s3";

import { requireCognitoAuth } from "@/lib/api-auth";

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
 * Issues a short-lived presigned S3 PUT URL.
 *
 * Supported folders:
 *
 * teacher-documents
 *   → Existing teacher onboarding upload flow.
 *   → Uses the client-supplied teacherId.
 *
 * course-media
 *   → Uses Cognito authentication.
 *   → Teacher is identified from auth.payload.sub.
 *
 * child-photos
 *   → Uses the parent's idToken cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      folder,
      fileName,
      contentType,
      teacherId,
    } = body ?? {};

    // -----------------------------------------
    // Validate folder
    // -----------------------------------------

    if (!isUploadFolder(folder)) {
      return NextResponse.json(
        {
          error: "Invalid or missing folder",
        },
        { status: 400 },
      );
    }

    // -----------------------------------------
    // Validate filename
    // -----------------------------------------

    if (
      !fileName ||
      typeof fileName !== "string"
    ) {
      return NextResponse.json(
        {
          error: "fileName is required",
        },
        { status: 400 },
      );
    }

    // -----------------------------------------
    // Validate content type
    // -----------------------------------------

    if (
      !contentType ||
      !ALLOWED_UPLOAD_MIME_TYPES.includes(
        contentType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed types are PNG, JPG, PDF, and MP4.",
        },
        { status: 400 },
      );
    }

    let ownerId: string;

    // =========================================
    // TEACHER DOCUMENTS
    // =========================================

    if (
      folder ===
      UPLOAD_FOLDERS.TEACHER_DOCUMENTS
    ) {
      /*
       * IMPORTANT:
       * Keep the existing teacher-document
       * flow unchanged.
       */

      if (
        !teacherId ||
        typeof teacherId !== "string"
      ) {
        return NextResponse.json(
          {
            error:
              "teacherId is required for document uploads",
          },
          { status: 400 },
        );
      }

      const teacher =
        await prisma.teacher.findUnique({
          where: {
            id: teacherId,
          },
        });

      if (!teacher) {
        return NextResponse.json(
          {
            error: "Teacher not found",
          },
          { status: 404 },
        );
      }

      ownerId = teacher.id;
    }

    // =========================================
    // COURSE MEDIA
    // =========================================

    else if (
      folder === UPLOAD_FOLDERS.COURSE_MEDIA
    ) {
      /*
       * Course uploads use Cognito authentication.
       *
       * We do NOT trust teacherId from the browser.
       */

      const auth = requireCognitoAuth(req);

      if ("error" in auth) {
        return auth.error;
      }

      const teacher =
        await prisma.teacher.findUnique({
          where: {
            cognitoId: auth.payload.sub,
          },
          select: {
            id: true,
          },
        });

      if (!teacher) {
        return NextResponse.json(
          {
            error: "Teacher not found",
          },
          { status: 404 },
        );
      }

      ownerId = teacher.id;
    }

    // =========================================
    // CHILD PHOTOS
    // =========================================

    else {
      /*
       * Existing child-photo flow.
       *
       * Parent is identified through the
       * idToken cookie, not client input.
       */

      const token =
        req.cookies.get("idToken")?.value;

      if (!token) {
        return NextResponse.json(
          {
            error: "Not logged in",
          },
          { status: 401 },
        );
      }

      const decoded =
        jwtDecode(token) as DecodedToken;

      const parent =
        await prisma.parentProfile.findUnique({
          where: {
            cognitoSub: decoded.sub,
          },
        });

      if (!parent) {
        return NextResponse.json(
          {
            error: "Complete step 1 first",
          },
          { status: 400 },
        );
      }

      ownerId = parent.id;
    }

    // =========================================
    // BUILD S3 KEY
    // =========================================

    const key = buildS3Key(
      folder,
      ownerId,
      fileName,
    );

    // =========================================
    // CREATE PRESIGNED URL
    // =========================================

    const uploadUrl =
      await createPresignedUploadUrl(
        key,
        contentType,
      );

    return NextResponse.json({
      uploadUrl,
      key,
    });
  } catch (error) {
    console.error(
      "Presign upload error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create upload URL",
      },
      { status: 500 },
    );
  }
}