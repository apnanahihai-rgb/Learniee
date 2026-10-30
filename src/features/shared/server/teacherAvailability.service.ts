import { prisma } from "@/lib/prisma";
import {
  normalizeAvailability,
  type AvailabilitySlot,
} from "@/features/shared/utils/availability";

export class AvailabilityError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string,
  ) {
    super(message);
    this.name = "AvailabilityError";
  }
}

export async function getTeacherAvailability(
  teacherId: string,
): Promise<AvailabilitySlot[]> {
  const rows = await prisma.teacherAvailability.findMany({
    where: { teacherId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    select: { dayOfWeek: true, startTime: true, endTime: true },
  });

  return rows;
}

/** Replaces the Teacher's whole weekly pattern in one transaction. */
export async function replaceTeacherAvailability(
  teacherId: string,
  input: unknown,
): Promise<AvailabilitySlot[]> {
  const result = normalizeAvailability(input);

  if ("error" in result) {
    throw new AvailabilityError(result.error, 400);
  }

  await prisma.$transaction([
    prisma.teacherAvailability.deleteMany({ where: { teacherId } }),
    prisma.teacherAvailability.createMany({
      data: result.slots.map((s) => ({ teacherId, ...s })),
    }),
  ]);

  return result.slots;
}

/** Throws unless the Teacher has set at least one slot (used by course creation). */
export async function assertTeacherHasAvailability(teacherId: string) {
  const count = await prisma.teacherAvailability.count({ where: { teacherId } });

  if (count === 0) {
    throw new AvailabilityError(
      "Set your weekly availability in Calendar before creating a course.",
      403,
      "AVAILABILITY_REQUIRED",
    );
  }
}
