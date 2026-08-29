import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";

/**
 * GET
 *
 * Name/email for the ParentNavbar. Deliberately its own endpoint
 * rather than reusing `requireParentId` (features/parent/server/
 * auth.ts) - that helper only selects `{ id: true }`, this route
 * needs the display fields instead, so keeping them separate avoids
 * over-fetching on every other parent route just to support this
 * one navbar.
 */
export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const parent = await prisma.parentProfile.findUnique({
      where: {
        cognitoSub: auth.payload.sub,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visibleName: true,
        email: true,
      },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Parent profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      parent,
    });
  } catch (error) {
    console.error("Parent profile error:", error);

    return NextResponse.json(
      { error: "Failed to fetch parent profile" },
      { status: 500 },
    );
  }
}
