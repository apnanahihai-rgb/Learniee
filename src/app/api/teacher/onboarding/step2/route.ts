import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { teacherId, ...professionalData } = data;

    if (!teacherId) return NextResponse.json({ error: "Teacher ID missing" }, { status: 400 });

    const professionalInfo = await prisma.teacherProfessional.create({
      data: {
        teacherId,
        ...professionalData,
      },
    });

    return NextResponse.json({ success: true, data: professionalInfo });
  } catch (error) {
    console.error("Teacher Step 2 Error:", error);
    return NextResponse.json({ error: "Failed to save professional info" }, { status: 500 });
  }
}