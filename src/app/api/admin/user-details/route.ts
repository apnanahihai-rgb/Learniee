import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/verifyAdmin";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email");
  const role = req.nextUrl.searchParams.get("role");
  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  if (role === "parent") {
    const parent = await prisma.parentProfile.findUnique({
      where: { email },
      include: { students: true },
    });
    if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user: parent });
  }

  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { email },
      include: { professionalInfo: true, files: true, TeacherDocuments: true },
    });
    if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user: teacher });
  }

  return NextResponse.json({ error: "Invalid role" }, { status: 400 });
}