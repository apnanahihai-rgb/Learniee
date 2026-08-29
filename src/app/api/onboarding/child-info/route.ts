import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPresignedDownloadUrl } from "@/lib/s3";
import { parseAge } from "@/lib/utils";
import { requireCognitoAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = requireCognitoAuth(req);

  if ("error" in auth) {
    return auth.error;
  }

  const body = await req.json();

  const parent = await prisma.parentProfile.findUnique({
    where: { cognitoSub: auth.payload.sub },
  });
  if (!parent) return NextResponse.json({ error: "Complete step 1 first" }, { status: 400 });

  // The photo, if any, was already uploaded straight to S3 from the
  // browser via a presigned URL (see /api/upload/presign) - we only
  // ever receive the resulting object key here, never raw bytes.
  // The bucket stays private, so we store the S3 key itself in
  // `photoUrl` (not a public link) and generate a short-lived
  // presigned GET URL below to hand back to the client for
  // immediate display. Anywhere else that needs to show this photo
  // later should call createPresignedDownloadUrl(student.photoUrl)
  // again at read time, since the one below will expire.
  const photoKey: string | undefined = body.photoKey;

  const student = await prisma.student.create({
    data: {
      parentId: parent.id,
      firstName: body.firstName,
      lastName: body.lastName,
      visibleName: body.visibleName,
      gender: body.gender,
      age: parseAge(body.age),
      standard: body.standard,
      board: body.board,
      currentSchoolName: body.currentSchoolName,
      learningDifficulties: body.learningDifficulties,
      photoUrl: photoKey || null,
    },
  });

  const photoViewUrl = photoKey
    ? await createPresignedDownloadUrl(photoKey)
    : null;

  return NextResponse.json({
    success: true,
    studentId: student.id,
    photoViewUrl,
  });
}
