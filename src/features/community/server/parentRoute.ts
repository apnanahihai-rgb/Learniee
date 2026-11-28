import "server-only";

import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";

import { CommunityError } from "./community.service";

/**
 * Shared wrapper for the Parent Community routes: signature-verified Parent
 * auth (`requireParentId`, reads the session cookie from `req`) and one place
 * that turns `CommunityError` into a JSON error.
 */
export async function runParentCommunityRoute(
  req: Request,
  label: string,
  fallbackMessage: string,
  handler: (parentId: string) => Promise<Response>,
): Promise<Response> {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    return await handler(parent.parentId);
  } catch (error) {
    if (error instanceof CommunityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(`${label}:`, error);

    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
}
