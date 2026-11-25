import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";

/**
 * GET/PATCH `/api/admin/profile` — new (Sep 10, 2026), backs the new
 * `/admin/profile` page. `Admin` is a minimal model (no address
 * like Parent/Teacher — see `03-DATA-MODEL.md`), so this only
 * has name and an optional phone to show/edit plus a read-only email
 * + join date (phone added Nov 2026 for the redesigned profile page).
 *
 * Signature-verified auth (`requireVerifiedAdminAuth`) — same JWT
 * signature/expiry/role checks as the money routes, so a forged
 * token can't read or edit an Admin's profile.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const admin = await prisma.admin.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Admin profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ admin });
  } catch (error) {
    console.error("Admin profile error:", error);

    return NextResponse.json(
      { error: "Failed to fetch admin profile" },
      { status: 500 },
    );
  }
}

const EDITABLE_FIELDS = ["firstName", "lastName", "phone"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];
type ProfileUpdateBody = Partial<Record<EditableField, string>>;

export async function PATCH(req: Request) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const body = (await req.json()) as ProfileUpdateBody;

    const data: ProfileUpdateBody = {};
    for (const field of EDITABLE_FIELDS) {
      if (typeof body[field] === "string") {
        data[field] = body[field]!.trim();
      }
    }

    // Phone is optional: blank clears it, otherwise 7-15 digits (a leading + and
    // spaces / dashes / brackets are allowed).
    let phone: string | null | undefined;
    if (typeof data.phone === "string") {
      if (data.phone === "") {
        phone = null;
      } else {
        const digits = data.phone.replace(/\D/g, "");

        if (!/^\+?[\d\s\-()]+$/.test(data.phone) || digits.length < 7 || digits.length > 15) {
          return NextResponse.json(
            { error: "Enter a valid phone number, for example +91 98765 43210." },
            { status: 400 },
          );
        }

        phone = data.phone;
      }
    }

    if (data.firstName === "" || data.lastName === "") {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 },
      );
    }

    const update: { firstName?: string; lastName?: string; phone?: string | null } = {};
    if (data.firstName !== undefined) update.firstName = data.firstName;
    if (data.lastName !== undefined) update.lastName = data.lastName;
    if (phone !== undefined) update.phone = phone;

    const admin = await prisma.admin.update({
      where: { cognitoId: auth.payload.sub },
      data: update,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ admin });
  } catch (error) {
    console.error("Admin profile update error:", error);

    return NextResponse.json(
      { error: "Failed to update the admin profile." },
      { status: 500 },
    );
  }
}
