import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { listAdminUsers } from "@/features/admin/server/userManagement.service";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await listAdminUsers();

    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/users] list failed", error);

    return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  }
}
