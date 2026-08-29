import { NextResponse } from "next/server";

import { requireCognitoAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the logged-in Parent's `ParentProfile.id` from the
 * request's Cognito ID token.
 *
 * Every `/api/parent/students*` route needs the same two things
 * before it can do anything: a valid Cognito session, and that
 * session's `ParentProfile` row (a Parent who hasn't finished
 * onboarding has a Cognito user but no `ParentProfile` yet). This
 * collapses both checks - previously copy-pasted in four places
 * (GET/POST on `/api/parent/students`, GET/DELETE on
 * `/api/parent/students/[studentId]`) - into one call:
 *
 *   const parent = await requireParentId(req);
 *   if ("error" in parent) return parent.error;
 *   // use parent.parentId
 *
 * Not used by `/api/parent/courses` (doesn't need a parentId, just
 * a valid session) or `/api/parent/profile` (needs a different
 * `select` shape than the `{ id: true }` used here).
 */
export async function requireParentId(
  req: Request,
): Promise<{ parentId: string } | { error: NextResponse }> {
  const auth = requireCognitoAuth(req);

  if ("error" in auth) {
    return { error: auth.error };
  }

  const parent = await prisma.parentProfile.findUnique({
    where: { cognitoSub: auth.payload.sub },
    select: { id: true },
  });

  if (!parent) {
    return {
      error: NextResponse.json(
        { error: "Complete onboarding first." },
        { status: 400 },
      ),
    };
  }

  return { parentId: parent.id };
}
