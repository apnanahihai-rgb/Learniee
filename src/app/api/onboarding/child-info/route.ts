import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { prisma } from "@/lib/prisma";

interface DecodedToken {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  phone_number?: string;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("idToken")?.value;
  if (!token) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const decoded = jwtDecode(token) as DecodedToken;
  const body = await req.json();

  const parent = await prisma.parentProfile.findUnique({
    where: { cognitoSub: decoded.sub },
  });
  if (!parent) return NextResponse.json({ error: "Complete step 1 first" }, { status: 400 });

  await prisma.student.create({
    data: {
      parentId: parent.id,
      firstName: body.firstName,
      lastName: body.lastName,
      visibleName: body.visibleName,
      gender: body.gender,
      age: body.age ? parseInt(body.age) : null,
      standard: body.standard,
      board: body.board,
      currentSchoolName: body.currentSchoolName,
      learningDifficulties: body.learningDifficulties,
    },
  });

  return NextResponse.json({ success: true });
}