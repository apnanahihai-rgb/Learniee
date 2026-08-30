import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";
import { UPLOAD_FOLDERS, type UploadFolder } from "@/lib/s3";

type OwnerResolution = { ownerId: string } | { error: NextResponse };

/**
 * Resolves the S3 "owner" ID (used to scope the upload key) for a
 * presigned-upload request, based on the caller's verified Cognito
 * session — never from client-supplied input.
 *
 * TEACHER_DOCUMENTS and COURSE_MEDIA both resolve to the requesting
 * Teacher's id via an identical lookup; this used to be two
 * copy-pasted blocks in presign/route.ts. Any other folder
 * (currently just CHILD_PHOTOS) resolves to the requesting Parent's id.
 */
export async function resolveUploadOwnerId(
  folder: UploadFolder,
  req: NextRequest,
): Promise<OwnerResolution> {
  const auth = requireCognitoAuth(req);
  if ("error" in auth) {
    return { error: auth.error };
  }

  if (folder === UPLOAD_FOLDERS.TEACHER_DOCUMENTS || folder === UPLOAD_FOLDERS.COURSE_MEDIA) {
    const teacher = await prisma.teacher.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: { id: true },
    });

    if (!teacher) {
      return {
        error: NextResponse.json({ error: "Teacher not found" }, { status: 404 }),
      };
    }

    return { ownerId: teacher.id };
  }

  // CHILD_PHOTOS: parent is identified through Cognito auth, not client input.
  const parent = await prisma.parentProfile.findUnique({
    where: { cognitoSub: auth.payload.sub },
  });

  if (!parent) {
    return {
      error: NextResponse.json({ error: "Complete step 1 first" }, { status: 400 }),
    };
  }

  return { ownerId: parent.id };
}
