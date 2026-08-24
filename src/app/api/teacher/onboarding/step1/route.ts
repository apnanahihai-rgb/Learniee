import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { email, password, firstName, lastName, ...personalData } = data;

    // Temporary mock Cognito ID until AWS Cognito service is wired up
    const mockCognitoId = `temp-sub-${Date.now()}`;

    // Save user to RDS via Prisma
    const newTeacher = await prisma.teacher.create({
      data: {
        cognitoId: mockCognitoId,
        email,
        firstName,
        lastName,
        ...personalData,
      },
    });

    return NextResponse.json({ success: true, teacherId: newTeacher.id });
  } catch (error) {
    console.error("Teacher Step 1 Error:", error);
    return NextResponse.json({ error: "Failed to register teacher" }, { status: 500 });
  }
}