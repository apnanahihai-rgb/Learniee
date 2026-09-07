import { prisma } from "@/lib/prisma";

/**
 * Lists every demo booking made WITH a given teacher, most recent
 * first — the read path behind /teacher/demo (previously a dead
 * sidebar link with no page or API route at all; the parent side
 * already had `getDemoBookingsForParent` in demoCoupon.service.ts,
 * this is the teacher-side equivalent).
 *
 * Lives in shared/server rather than teacher/server because
 * `DemoBooking.parentId` is a denormalized scalar with no Prisma
 * `@relation` back to `ParentProfile` (see 03-DATA-MODEL.md) — same
 * pattern used elsewhere in this schema (Enrollment.parentId,
 * ChatRoom.parentId, etc.), so the parent's name has to be joined in
 * manually with a second batched query instead of a Prisma `include`.
 */
export async function getDemoBookingsForTeacher(teacherId: string) {
  const bookings = await prisma.demoBooking.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: { id: true, firstName: true, visibleName: true },
      },
      course: {
        select: { id: true, courseTitle: true },
      },
    },
  });

  const parentIds = [...new Set(bookings.map((b) => b.parentId))];

  const parents = parentIds.length
    ? await prisma.parentProfile.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, firstName: true, lastName: true, visibleName: true },
      })
    : [];

  const parentById = new Map(parents.map((p) => [p.id, p]));

  return bookings.map((b) => ({
    ...b,
    parent: parentById.get(b.parentId) ?? null,
  }));
}
