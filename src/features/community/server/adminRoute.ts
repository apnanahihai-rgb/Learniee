import "server-only";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { actorFromTokenPayload } from "@/features/shared/server/activityLog.service";

import { CommunityError, type CommunityActor } from "./community.service";

/**
 * Shared wrapper for the Admin Community routes: signature-verified Admin
 * auth (`requireAdmin`), the acting Admin as a `CommunityActor`, and one
 * place that turns `CommunityError` into a JSON error.
 */
export async function runAdminCommunityRoute(
  label: string,
  fallbackMessage: string,
  handler: (actor: CommunityActor) => Promise<Response>,
): Promise<Response> {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { actorId, actorName, actorEmail } = actorFromTokenPayload({
      sub: admin.sub,
      email: typeof admin.email === "string" ? admin.email : undefined,
      given_name: typeof admin.given_name === "string" ? admin.given_name : undefined,
      family_name: typeof admin.family_name === "string" ? admin.family_name : undefined,
    });

    return await handler({ sub: actorId, name: actorName, email: actorEmail });
  } catch (error) {
    if (error instanceof CommunityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(`${label}:`, error);

    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
}

/** Parses a JSON body; anything that is not an object becomes `{}`. */
export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  const body: unknown = await req.json().catch(() => ({}));

  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}
