import "server-only";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { actorFromTokenPayload } from "@/features/shared/server/activityLog.service";
import { RatingRemovalError, type RemovalAdmin } from "@/features/admin/server/ratingRemoval.service";

/**
 * Shared wrapper for the two delete routes: verified Admin check,
 * JSON `{ reason }` body, and one place that maps errors to responses.
 */
export async function handleRemoval(
  req: Request,
  run: (args: { reason: unknown; admin: RemovalAdmin }) => Promise<Record<string, unknown> | void>,
  failMessage: string,
) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const actor = actorFromTokenPayload({
      sub: admin.sub as string,
      email: admin.email as string | undefined,
      given_name: admin.given_name as string | undefined,
      family_name: admin.family_name as string | undefined,
    });

    const extra = await run({
      reason: body?.reason,
      admin: { sub: actor.actorId ?? String(admin.sub), name: actor.actorName ?? undefined, email: actor.actorEmail ?? undefined },
    });

    return NextResponse.json({ success: true, ...(extra ?? {}) });
  } catch (error) {
    if (error instanceof RatingRemovalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(failMessage, error);

    return NextResponse.json({ error: failMessage }, { status: 500 });
  }
}
