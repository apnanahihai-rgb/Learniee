import { NextResponse } from "next/server";

import { requireVerifiedCognitoAuth } from "@/lib/verifiedCognitoAuth";
import { prisma } from "@/lib/prisma";
import { TeacherApprovalStatus } from "@prisma/client";

/**
 * Server-side approval gate (Oct 14, 2026). Every route that uses
 * `requireTeacherId` / `requireVerifiedTeacherId` is only for APPROVED
 * teachers; the pre-approval routes (onboarding, profile, settings, appeal)
 * use `requireVerifiedCognitoAuth` directly and are not affected. Checked against the
 * database on every request, so an Admin rejecting a teacher locks them out
 * immediately instead of when the client next refreshes.
 */
export function teacherNotApprovedResponse() {
  return NextResponse.json(
    { error: "Your teacher account is not approved.", code: "TEACHER_NOT_APPROVED" },
    { status: 403 },
  );
}

export function isTeacherApproved(status: TeacherApprovalStatus): boolean {
  return status === TeacherApprovalStatus.APPROVED;
}

/**
 * Resolves the logged-in Teacher's `Teacher.id` from the request's
 * Cognito ID token.
 *
 * SIGNATURE-VERIFIED (Oct 15, 2026, 06-OPEN-DECISIONS.md #21): the token is
 * validated against Cognito's public keys and must carry `custom:role =
 * "teacher"`. `verifiedAuth.ts`'s `requireVerifiedTeacherId` is now the same
 * function under its old name.
 *
 * Mirrors `requireParentId` in `src/features/parent/server/auth.ts` —
 * before this, every teacher-scoped route (course create/list, and
 * now chat) re-did the same `requireCognitoAuth` + `prisma.teacher
 * .findUnique({ where: { cognitoId: sub } })` lookup inline (see
 * `/api/teacher/course/route.ts`). Collapsed into one call:
 *
 *   const teacher = await requireTeacherId(req);
 *   if ("error" in teacher) return teacher.error;
 *   // use teacher.teacherId
 *
 * Existing routes weren't refactored onto this in this patch (out of
 * scope for the chat feature) — only new chat routes use it. Worth a
 * follow-up pass to migrate `/api/teacher/course*` onto it too.
 */
export async function requireTeacherId(
  req: Request,
): Promise<{ teacherId: string } | { error: NextResponse }> {
  const auth = await requireVerifiedCognitoAuth(req, "teacher");

  if ("error" in auth) {
    return { error: auth.error };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { cognitoId: auth.payload.sub },
    select: { id: true, approvalStatus: true },
  });

  if (!teacher) {
    return {
      error: NextResponse.json(
        { error: "Teacher not found." },
        { status: 404 },
      ),
    };
  }

  if (!isTeacherApproved(teacher.approvalStatus)) {
    return { error: teacherNotApprovedResponse() };
  }

  return { teacherId: teacher.id };
}
