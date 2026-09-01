import { NextResponse } from "next/server";

import { requireCognitoAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the logged-in Teacher's `Teacher.id` from the request's
 * Cognito ID token.
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
  const auth = requireCognitoAuth(req);

  if ("error" in auth) {
    return { error: auth.error };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { cognitoId: auth.payload.sub },
    select: { id: true },
  });

  if (!teacher) {
    return {
      error: NextResponse.json(
        { error: "Teacher not found." },
        { status: 404 },
      ),
    };
  }

  return { teacherId: teacher.id };
}
