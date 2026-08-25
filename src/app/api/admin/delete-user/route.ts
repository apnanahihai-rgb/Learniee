import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/verifyAdmin";
import { adminDeleteCognitoUser } from "@/lib/cognitoAdmin";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await req.json();
  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  if (role === "parent") {
    const parent = await prisma.parentProfile.findUnique({ where: { email } });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }
    await prisma.parentProfile.delete({ where: { email } }); // Students cascade
    await adminDeleteCognitoUser(parent.cognitoSub);
  } else if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({ where: { email } });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }
    await prisma.teacher.delete({ where: { email } }); // TeacherFile + TeacherProfessional cascade
    await adminDeleteCognitoUser(teacher.cognitoId);
  } else {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}