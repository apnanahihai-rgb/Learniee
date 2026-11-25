import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";
import {
  UserManagementError,
  deleteAdminUser,
  isManagedRole,
} from "@/features/admin/server/userManagement.service";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: unknown; role?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !body.role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }
  if (!isManagedRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const role = body.role;

  try {
    await deleteAdminUser(email, role);
  } catch (error) {
    if (error instanceof UserManagementError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[admin/delete-user] failed", error);

    return NextResponse.json(
      { error: "Could not delete this account. Nothing else was changed, please try again." },
      { status: 500 },
    );
  }

  await logActivity({
    action: "USER_DELETED",
    actorRole: "ADMIN",
    ...actorFromTokenPayload({
      sub: String(admin.sub),
      email: typeof admin.email === "string" ? admin.email : undefined,
      given_name: typeof admin.given_name === "string" ? admin.given_name : undefined,
      family_name: typeof admin.family_name === "string" ? admin.family_name : undefined,
    }),
    description: `${role === "parent" ? "Parent" : "Teacher"} account deleted — ${email}.`,
    metadata: { deletedEmail: email, deletedRole: role },
  });

  return NextResponse.json({ success: true });
}
