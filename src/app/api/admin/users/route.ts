import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/verifyAdmin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [parents, teachers] = await Promise.all([
    prisma.parentProfile.findMany({
      select: { firstName: true, lastName: true, email: true },
    }),
    prisma.teacher.findMany({
      select: { firstName: true, lastName: true, email: true },
    }),
  ]);

  const users = [
    ...parents.map((p) => ({ ...p, role: "parent" as const })),
    ...teachers.map((t) => ({ ...t, role: "teacher" as const })),
  ];

  return NextResponse.json({ users });
}