import { prisma } from "@/lib/prisma";
import { createPresignedDownloadUrl } from "@/lib/s3";

/**
 * Raw request-body shape POSTed from the "add student" form.
 * `age` arrives as a string (same as onboarding Step 2) and is
 * parsed here, not on the client.
 */
export interface StudentFormInput {
  firstName: string;
  lastName: string;
  visibleName?: string;
  gender?: string;
  age?: string;
  standard?: string;
  board?: string;
  currentSchoolName?: string;
  learningDifficulties?: string;
  photoKey?: string;
}

/**
 * Creates an additional Student profile for an already-onboarded
 * parent.
 *
 * This is deliberately the same shape as onboarding Step 2 (Child
 * Information, src/app/api/onboarding/child-info/route.ts) - the
 * only difference is *when* it runs. Step 2 creates a parent's
 * first Student as part of the mandatory onboarding flow; this
 * creates every subsequent one, any time after onboarding is done.
 * Both ultimately just `prisma.student.create()` a new row scoped
 * to the same `parentId`, so a parent ends up with as many Student
 * rows as children they've added - there's no separate "profile"
 * concept to keep in sync, `Student` already *is* the profile.
 */
export async function createStudentForParent(
  parentId: string,
  input: StudentFormInput,
) {
  return prisma.student.create({
    data: {
      parentId,
      firstName: input.firstName,
      lastName: input.lastName,
      visibleName: input.visibleName || null,
      gender: input.gender || null,
      age: input.age ? parseInt(input.age, 10) || null : null,
      standard: input.standard || null,
      board: input.board || null,
      currentSchoolName: input.currentSchoolName || null,
      learningDifficulties: input.learningDifficulties || null,
      photoUrl: input.photoKey || null,
    },
  });
}

/**
 * Shapes a raw `Student` row (plus a resolved photo URL) into the
 * response shape the client expects. Shared by the list and
 * single-record lookups below so they can't drift apart.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toStudentProfile(student: any) {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    visibleName: student.visibleName,
    gender: student.gender,
    age: student.age,
    standard: student.standard,
    board: student.board,
    currentSchoolName: student.currentSchoolName,
    learningDifficulties: student.learningDifficulties,
    photoViewUrl: student.photoUrl
      ? await createPresignedDownloadUrl(student.photoUrl)
      : null,
    createdAt: student.createdAt,
  };
}

/**
 * Lists every Student profile belonging to a parent, most recently
 * added first, with a fresh short-lived presigned GET URL for each
 * photo (the bucket stays fully private - see src/lib/s3.ts).
 */
export async function getStudentsForParent(parentId: string) {
  const students = await prisma.student.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(students.map(toStudentProfile));
}

/**
 * Fetches a single Student profile, scoped to the requesting
 * parent - returns `null` both when the id doesn't exist AND when
 * it belongs to a different parent, so a caller can't distinguish
 * "not found" from "not yours" and probe for other parents' ids.
 */
export async function getStudentById(parentId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, parentId },
  });

  if (!student) {
    return null;
  }

  return toStudentProfile(student);
}

/**
 * Deletes a Student profile, scoped to the requesting parent.
 * Returns `false` (and deletes nothing) if the id doesn't belong to
 * this parent, same not-found-vs-not-yours reasoning as above.
 */
export async function deleteStudentForParent(
  parentId: string,
  studentId: string,
) {
  const result = await prisma.student.deleteMany({
    where: { id: studentId, parentId },
  });

  return result.count > 0;
}