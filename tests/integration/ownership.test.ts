import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The real Cognito signature check is replaced by "decode the token and trust it", so these tests
// exercise OWNERSHIP (who may see / touch which row), not signature verification (the sweeps do that).
vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({
      verify: async (token: string) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()),
    }),
  },
}));

import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tokenFor = (sub: string, role: string) =>
  `${b64({ alg: "none" })}.${b64({ sub, "custom:role": role, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
const cookie = (sub: string, role: string) => ({ cookie: `idToken=${tokenFor(sub, role)}` });

type Ctx = { params: Promise<Record<string, string>> };
const ctx = (p: Record<string, string>): Ctx => ({ params: Promise.resolve(p) });
type H = (req: Request, c: Ctx) => Promise<Response>;

async function run(path: string, method: "GET" | "POST", params: Record<string, string>, headers: Record<string, string>, body?: unknown) {
  const mod = (await import(/* @vite-ignore */ path)) as Record<string, H>;
  return mod[method](
    new Request("http://localhost/api/x", {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    ctx(params),
  );
}

let A: Awaited<ReturnType<typeof createSessionFixture>>;
let B: Awaited<ReturnType<typeof createSessionFixture>>;
let invoiceA: { id: string };

const parentA = () => cookie(A.parent.cognitoSub, "parent");
const parentB = () => cookie(B.parent.cognitoSub, "parent");
const teacherA = () => cookie(A.teacher.cognitoId, "teacher");
const teacherB = () => cookie(B.teacher.cognitoId, "teacher");

beforeAll(async () => {
  await resetDb();
  // Class started 5 min ago so Start / Join are inside their window.
  A = await createSessionFixture({ startsAt: new Date(Date.now() - 5 * 60_000) });
  B = await createSessionFixture({ startsAt: new Date(Date.now() - 5 * 60_000) });
  invoiceA = await prisma.invoice.create({
    data: {
      type: "ENROLLMENT_PAYMENT",
      invoiceNumber: "INV-OWN-A",
      payerId: A.parent.id,
      payerRole: "PARENT",
      amount: 2000,
      currency: "INR",
      description: "test",
      referenceType: "ENROLLMENT",
      referenceId: A.enrollment.id,
    },
  });
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const SESSION_GET = "@/app/api/parent/class-sessions/[sessionId]/route";
const MY_CLASSES = "@/app/api/parent/my-classes/[enrollmentId]/route";
const INVOICE_ONE = "@/app/api/parent/invoices/[invoiceId]/route";
const INVOICES = "@/app/api/parent/invoices/route";
const CONFIRM = "@/app/api/parent/class-sessions/[sessionId]/confirm/route";
const REPORT = "@/app/api/parent/class-sessions/[sessionId]/report/route";
const JOIN = "@/app/api/parent/class-sessions/[sessionId]/join/route";
const T_START = "@/app/api/teacher/class-sessions/[sessionId]/start/route";
const T_END = "@/app/api/teacher/class-sessions/[sessionId]/end/route";
const T_CANCEL = "@/app/api/teacher/class-sessions/[sessionId]/cancel/route";

describe("positive controls (the mock works and owners are allowed)", () => {
  it("parent A can read their own session", async () => {
    const r = await run(SESSION_GET, "GET", { sessionId: A.session.id }, parentA());
    expect(r.status).toBe(200);
  });
  it("parent A can read their own My Classes page", async () => {
    const r = await run(MY_CLASSES, "GET", { enrollmentId: A.enrollment.id }, parentA());
    expect(r.status).toBe(200);
  });
  it("parent A can read their own invoice", async () => {
    const r = await run(INVOICE_ONE, "GET", { invoiceId: invoiceA.id }, parentA());
    expect(r.status).toBe(200);
  });
});

describe("parent B cannot touch parent A's data", () => {
  const notOk = (r: Response) => expect([403, 404]).toContain(r.status);

  it("read A's session", async () => notOk(await run(SESSION_GET, "GET", { sessionId: A.session.id }, parentB())));
  it("read A's My Classes page", async () => notOk(await run(MY_CLASSES, "GET", { enrollmentId: A.enrollment.id }, parentB())));
  it("read A's invoice by id (404, never confirms it exists)", async () => {
    expect((await run(INVOICE_ONE, "GET", { invoiceId: invoiceA.id }, parentB())).status).toBe(404);
  });
  it("B's invoice list does not contain A's invoice", async () => {
    const r = await run(INVOICES, "GET", {}, parentB());
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(JSON.stringify(body)).not.toContain(invoiceA.id);
  });
  it("join A's class", async () => {
    notOk(await run(JOIN, "POST", { sessionId: A.session.id }, parentB()));
    const s = await prisma.classSession.findUniqueOrThrow({ where: { id: A.session.id } });
    expect(s.studentJoinedAt).toBeNull();
  });
  it("confirm A's class", async () => {
    notOk(await run(CONFIRM, "POST", { sessionId: A.session.id }, parentB()));
    expect((await prisma.classSession.findUniqueOrThrow({ where: { id: A.session.id } })).settledAt).toBeNull();
  });
  it("report A's class", async () => {
    notOk(await run(REPORT, "POST", { sessionId: A.session.id }, parentB(), { note: "this is a made up problem" }));
    expect((await prisma.classSession.findUniqueOrThrow({ where: { id: A.session.id } })).reportedAt).toBeNull();
  });
});

describe("teacher B cannot touch teacher A's class", () => {
  const notOk = (r: Response) => expect([403, 404]).toContain(r.status);

  it("start A's class", async () => {
    notOk(await run(T_START, "POST", { sessionId: A.session.id }, teacherB()));
    expect((await prisma.classSession.findUniqueOrThrow({ where: { id: A.session.id } })).teacherStartedAt).toBeNull();
  });
  it("end A's class", async () => notOk(await run(T_END, "POST", { sessionId: A.session.id }, teacherB())));
  it("cancel A's class", async () => {
    notOk(await run(T_CANCEL, "POST", { sessionId: A.session.id }, teacherB(), { reason: "not mine to cancel" }));
    expect((await prisma.classSession.findUniqueOrThrow({ where: { id: A.session.id } })).status).toBe("SCHEDULED");
  });
});

describe("role mix-ups", () => {
  it("a parent token cannot use a teacher route", async () => {
    expect([401, 403]).toContain((await run(T_START, "POST", { sessionId: A.session.id }, parentA())).status);
  });
  it("a teacher token cannot use a parent route", async () => {
    expect([401, 403]).toContain((await run(SESSION_GET, "GET", { sessionId: A.session.id }, teacherA())).status);
  });
});

describe("teacher approval is enforced by the server (06 #68)", () => {
  for (const status of ["PENDING", "REJECTED"] as const) {
    it(`a ${status} teacher is refused with 403 TEACHER_NOT_APPROVED`, async () => {
      await prisma.teacher.update({ where: { id: A.teacher.id }, data: { approvalStatus: status } });
      const r = await run(T_START, "POST", { sessionId: A.session.id }, teacherA());
      expect(r.status).toBe(403);
      expect((await r.json()).code).toBe("TEACHER_NOT_APPROVED");
      expect((await prisma.classSession.findUniqueOrThrow({ where: { id: A.session.id } })).teacherStartedAt).toBeNull();
    });
  }
  it("the same teacher works again once approved (admin flips it back)", async () => {
    await prisma.teacher.update({ where: { id: A.teacher.id }, data: { approvalStatus: "APPROVED" } });
    const r = await run(T_START, "POST", { sessionId: A.session.id }, teacherA());
    expect(r.status).toBe(200);
    expect((await prisma.classSession.findUniqueOrThrow({ where: { id: A.session.id } })).teacherStartedAt).not.toBeNull();
  });
});