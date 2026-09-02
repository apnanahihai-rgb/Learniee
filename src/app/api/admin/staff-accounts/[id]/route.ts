import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/verifyAdmin";
import { deleteStaffAccount } from "@/features/admin/server/staffAccount.service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteStaffAccount(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete staff account." },
      { status: 400 },
    );
  }
}
