import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { teacherId, panCardNumber, ...documentKeys } = data;

    if (!teacherId) return NextResponse.json({ error: "Teacher ID missing" }, { status: 400 });

    // Note: Actual file uploads will be processed prior to this route, 
    // and this route simply stores the returned keys/paths alongside the PAN card.
    const documents = await prisma.teacherDocuments.create({
      data: {
        teacherId,
        panCardNumber,
        ...documentKeys
      },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error("Teacher Step 3 Error:", error);
    return NextResponse.json({ error: "Failed to save documents" }, { status: 500 });
  }
}