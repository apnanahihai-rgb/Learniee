import { beforeAll, describe, expect, it } from "vitest";
import { decideCertificate, getCertificatesForStudent } from "@/features/shared/server/certificate.service";
import { runEnrollmentAutoLapse } from "@/features/shared/server/enrollmentAutoLapse.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const DAY = 86_400_000;
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

beforeAll(async () => {
  await resetDb();
});

type F = Awaited<ReturnType<typeof createSessionFixture>>;

/** Course with certificates on (threshold 2) and `counted` COMPLETED sessions on the enrollment. */
async function certFixture(counted: number) {
  const f = await createSessionFixture({});
  await prisma.course.update({
    where: { id: f.course.id },
    data: { certificateEnabled: true, certificateSessionThreshold: 2 },
  });
  for (let i = 0; i < counted; i++) {
    const startsAt = new Date(f.startsAt.getTime() - i * DAY);
    const data = {
      status: "COMPLETED" as const,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 3_600_000),
      scheduledDate: utcMidnight(startsAt),
    };
    if (i === 0) {
      await prisma.classSession.update({ where: { id: f.session.id }, data });
    } else {
      await prisma.classSession.create({
        data: {
          enrollmentId: f.enrollment.id,
          teacherId: f.teacher.id,
          studentId: f.student.id,
          parentId: f.parent.id,
          scheduledTime: "10:00",
          cycleId: f.cycle.id,
          sessionNumber: i + 1,
          lengthMinutes: 60,
          ...data,
        },
      });
    }
  }
  return f;
}

describe("Certificates", () => {
  it("enough counted sessions: Teacher issues, parent can see it", async () => {
    const f = await certFixture(3);
    await decideCertificate(f.teacher.id, f.enrollment.id, "issue");
    const c = await prisma.certificate.findUniqueOrThrow({ where: { enrollmentId: f.enrollment.id } });
    expect(c.status).toBe("ISSUED");
    expect(c.sessionsRequired).toBe(2);
    expect(c.sessionsCompleted).toBe(3);
    const list = await getCertificatesForStudent(f.parent.id, f.student.id);
    expect(list).toHaveLength(1);
  });

  it("below the threshold: refused, no certificate row", async () => {
    const f = await certFixture(1);
    await expect(decideCertificate(f.teacher.id, f.enrollment.id, "issue")).rejects.toThrow();
    expect(await prisma.certificate.count({ where: { enrollmentId: f.enrollment.id } })).toBe(0);
  });

  it("the decision is final: a second decision is refused", async () => {
    const f = await certFixture(3);
    await decideCertificate(f.teacher.id, f.enrollment.id, "issue");
    await expect(decideCertificate(f.teacher.id, f.enrollment.id, "decline")).rejects.toThrow();
    const c = await prisma.certificate.findUniqueOrThrow({ where: { enrollmentId: f.enrollment.id } });
    expect(c.status).toBe("ISSUED");
  });

  it("declined: the parent sees nothing", async () => {
    const f = await certFixture(3);
    await decideCertificate(f.teacher.id, f.enrollment.id, "decline");
    const c = await prisma.certificate.findUniqueOrThrow({ where: { enrollmentId: f.enrollment.id } });
    expect(c.status).toBe("DECLINED");
    const list = await getCertificatesForStudent(f.parent.id, f.student.id);
    expect(list ?? []).toHaveLength(0);
  });

  it("another teacher cannot decide it", async () => {
    const f = await certFixture(3);
    const other = await createSessionFixture({});
    await expect(decideCertificate(other.teacher.id, f.enrollment.id, "issue")).rejects.toThrow();
    expect(await prisma.certificate.count({ where: { enrollmentId: f.enrollment.id } })).toBe(0);
  });
});

async function agedEnrollment(f: F, legacy: boolean, daysIdle: number) {
  await prisma.classSession.deleteMany({ where: { enrollmentId: f.enrollment.id } });
  const old = new Date(Date.now() - daysIdle * DAY);
  await prisma.enrollment.update({
    where: { id: f.enrollment.id },
    data: { isLegacy: legacy, cycleStartDate: old, lastClassAt: old, createdAt: old },
  });
}

describe("Auto-lapse (45 days idle)", () => {
  it("legacy enrollment idle 60 days -> LAPSED", async () => {
    const f = await createSessionFixture({});
    await agedEnrollment(f, true, 60);
    await runEnrollmentAutoLapse();
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } })).status).toBe("LAPSED");
  });

  it("legacy enrollment idle 10 days -> stays ACTIVE", async () => {
    const f = await createSessionFixture({});
    await agedEnrollment(f, true, 10);
    await runEnrollmentAutoLapse();
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } })).status).toBe("ACTIVE");
  });

  it("cycle-model enrollment idle 60 days -> stays ACTIVE (never auto-lapsed)", async () => {
    const f = await createSessionFixture({});
    await agedEnrollment(f, false, 60);
    await runEnrollmentAutoLapse();
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: f.enrollment.id } })).status).toBe("ACTIVE");
  });
});