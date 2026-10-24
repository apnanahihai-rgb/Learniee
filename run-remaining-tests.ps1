# run-remaining-tests.ps1  -- run from the repo root (the folder with package.json):  .\run-remaining-tests.ps1
# Open PowerShell yourself, cd to the repo root, then run it. Do not paste it into the console.
$ErrorActionPreference = "Continue"
$env:NO_COLOR = "1"
$root = (Get-Location).Path
$log  = Join-Path $env:TEMP ("learniee-test-run-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")
$fails = New-Object System.Collections.ArrayList
$times = [string][char]0x00D7   # the "x" vitest prints for failed tests (kept out of the file as a literal)

function Fail($m) { throw "STOP: $m" }
function W($p, $c) {
  $full = Join-Path $root $p
  New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
  [IO.File]::WriteAllText($full, $c, (New-Object Text.UTF8Encoding($false)))
  Write-Host "  wrote $p"
}
function Step($title, [scriptblock]$cmd) {
  Write-Host "`n=== $title ===" -ForegroundColor Cyan
  $out = & $cmd 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  "=== $title ===" | Add-Content $log
  $out | Add-Content $log
  $out | Select-String -Pattern "Test Files|Tests |FAIL| $times |error TS" | Select-Object -First 40 | ForEach-Object { Write-Host $_.Line }
  if ($code -ne 0) { [void]$fails.Add($title); Write-Host "-> FAILED (exit $code)" -ForegroundColor Red }
  else { Write-Host "-> ok" -ForegroundColor Green }
}

try {

# ---- 0. Preflight -------------------------------------------------------------------------------
if (-not (Test-Path "package.json") -or -not (Test-Path "vitest.integration.config.ts")) { Fail "Run this from the Learniee repo root." }
if (-not (Test-Path ".env.test")) { Fail ".env.test is missing (see 09-TESTING-GUIDE.md section 2.1)." }
$envTest = Get-Content ".env.test" | Out-String
if ($envTest -notmatch "localhost:5433/learniee_test") { Fail ".env.test DATABASE_URL must be localhost:5433/learniee_test." }
if ($envTest -match "(?im)^\s*RAZORPAYX_ENABLED\s*=\s*true") { Fail "RAZORPAYX_ENABLED=true in .env.test. Set it to false." }

docker ps 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "Docker Desktop is not running. Start it, wait a minute, run again." }
docker start learniee-test-db | Out-Null
Start-Sleep -Seconds 5
$st = docker ps --filter name=learniee-test-db --format "{{.Status}}"
if (-not $st) { Fail "Container learniee-test-db is not running." }
Write-Host "Test DB container: $st" -ForegroundColor Green

# ---- 1. Write the new test files ----------------------------------------------------------------
Write-Host "`nWriting test files..." -ForegroundColor Cyan

W "tests/integration/razorpayX.test.ts" @'
import { createHmac } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Real RazorpayX is NEVER called: every network function is replaced.
const gw = vi.hoisted(() => ({
  createPayout: vi.fn(),
  fetchPayout: vi.fn(),
  createContact: vi.fn(),
  createFundAccount: vi.fn(),
}));

vi.mock("@/lib/razorpayX", async (orig) => {
  const actual = await orig<typeof import("@/lib/razorpayX")>();
  return {
    ...actual,
    createPayout: gw.createPayout,
    fetchPayout: gw.fetchPayout,
    createContact: gw.createContact,
    createFundAccount: gw.createFundAccount,
  };
});

import { proceedLedgerPayout } from "@/features/shared/server/tuitionLedger/actions";
import {
  applyGatewayPayout,
  dispatchPayoutRecord,
  failPayoutRecord,
  reconcileProcessingPayouts,
} from "@/features/shared/server/teacherPayout/gateway";
import { RazorpayXError } from "@/lib/razorpayX";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";
import { createLedgerEntry } from "../helpers/ledger";

const SECRET = "test-x-webhook-secret";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

beforeAll(async () => {
  process.env.RAZORPAYX_WEBHOOK_SECRET = SECRET;
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  gw.createPayout.mockReset();
  gw.fetchPayout.mockReset();
  gw.createContact.mockReset().mockResolvedValue({ id: "cont_test" });
  gw.createFundAccount.mockReset().mockResolvedValue({ id: "fa_test" });
});

/** A queued ledger row, an approved bank account and a PROCESSING payout record, as mass-pay would leave them. */
async function processing(opts: { ageMinutes?: number; payoutId?: string } = {}) {
  const f = await createLedgerEntry();
  await proceedLedgerPayout(f.entry.id, "accounts-test-sub");
  await prisma.bankAccount.create({
    data: {
      teacherId: f.teacher.id,
      accountHolderName: "Tia Teacher",
      accountNumber: "000111222333",
      ifscCode: "TEST0000001",
      status: "APPROVED",
    },
  });
  const batch = await prisma.payoutBatch.create({
    data: { initiatedByStaffSub: "accounts-test-sub", totalAmount: 1400, teacherCount: 1, successCount: 0, skippedCount: 0 },
  });
  const record = await prisma.payoutRecord.create({
    data: {
      payoutBatchId: batch.id,
      teacherId: f.teacher.id,
      amount: 1400,
      cycleCount: 1,
      status: "PROCESSING",
      razorpayPayoutId: opts.payoutId ?? null,
      createdAt: new Date(Date.now() - (opts.ageMinutes ?? 0) * 60_000),
    },
  });
  await prisma.tuitionLedgerEntry.update({
    where: { id: f.entry.id },
    data: { payoutStatus: "PROCESSING", payoutRecordId: record.id },
  });
  return { ...f, record };
}

const recOf = (id: string) => prisma.payoutRecord.findUniqueOrThrow({ where: { id } });
const entOf = (id: string) => prisma.tuitionLedgerEntry.findUniqueOrThrow({ where: { id } });

describe("RazorpayX payout lifecycle (all gateway calls mocked)", () => {
  it("processed -> record SUCCESS, ledger PAID, UTR saved; applying twice changes nothing", async () => {
    const p = await processing();
    const entity = { id: "pout_1", status: "processed", reference_id: p.record.id, utr: "UTR123" };
    expect(await applyGatewayPayout(entity)).toBe("SETTLED");
    expect(await applyGatewayPayout(entity)).toBe("SETTLED");
    const r = await recOf(p.record.id);
    expect(r.status).toBe("SUCCESS");
    expect(r.utr).toBe("UTR123");
    expect(r.razorpayPayoutId).toBe("pout_1");
    const e = await entOf(p.entry.id);
    expect(e.payoutStatus).toBe("PAID");
    expect(e.paidAt).not.toBeNull();
    const paidNotices = await prisma.notification.count({ where: { recipientId: p.teacher.id, type: "PAYOUT_PAID" } });
    expect(paidNotices).toBe(1);
  });

  it("failed / reversed / rejected -> record FAILED and the cycle goes back to the Payment Queue", async () => {
    for (const status of ["failed", "reversed", "rejected"]) {
      const p = await processing();
      const out = await applyGatewayPayout({ id: `pout_${status}`, status, reference_id: p.record.id, failure_reason: "bank said no" });
      expect(out).toBe("FAILED");
      const r = await recOf(p.record.id);
      expect(r.status).toBe("FAILED");
      expect(r.failureReason).toContain("bank said no");
      const e = await entOf(p.entry.id);
      expect(e.payoutStatus).toBe("QUEUED_FOR_PAYMENT");
      expect(e.payoutRecordId).toBeNull();
    }
  });

  it("queued / pending / processing -> still PROCESSING, only the gateway status is remembered", async () => {
    const p = await processing();
    expect(await applyGatewayPayout({ id: "pout_q", status: "queued", reference_id: p.record.id })).toBe("PENDING");
    const r = await recOf(p.record.id);
    expect(r.status).toBe("PROCESSING");
    expect(r.gatewayStatus).toBe("queued");
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PROCESSING");
  });

  it("unknown payout -> UNKNOWN_RECORD and nothing changes", async () => {
    const p = await processing();
    expect(await applyGatewayPayout({ id: "pout_nobody", status: "processed", reference_id: "no-such-record" })).toBe("UNKNOWN_RECORD");
    expect((await recOf(p.record.id)).status).toBe("PROCESSING");
  });

  it("failure after success (late webhook) cannot undo a PAID payout", async () => {
    const p = await processing();
    await applyGatewayPayout({ id: "pout_x", status: "processed", reference_id: p.record.id });
    await applyGatewayPayout({ id: "pout_x", status: "failed", reference_id: p.record.id });
    expect((await recOf(p.record.id)).status).toBe("SUCCESS");
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PAID");
  });

  it("failPayoutRecord twice: second call does nothing", async () => {
    const p = await processing();
    expect(await failPayoutRecord(p.record.id, "boom")).toBe(true);
    expect(await failPayoutRecord(p.record.id, "boom again")).toBe(false);
  });

  it("dispatch: gateway answers processed -> SETTLED; idempotency key is the record id", async () => {
    const p = await processing();
    gw.createPayout.mockResolvedValue({ id: "pout_d1", status: "processed", reference_id: p.record.id, utr: "U1" });
    expect(await dispatchPayoutRecord(p.record.id)).toBe("SETTLED");
    const call = gw.createPayout.mock.calls[0][0];
    expect(call.idempotencyKey).toBe(p.record.id);
    expect(call.amountInRupees).toBe(1400);
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PAID");
  });

  it("dispatch: gateway answers queued -> SUBMITTED, stays PROCESSING", async () => {
    const p = await processing();
    gw.createPayout.mockResolvedValue({ id: "pout_d2", status: "queued", reference_id: p.record.id });
    expect(await dispatchPayoutRecord(p.record.id)).toBe("SUBMITTED");
    expect((await recOf(p.record.id)).status).toBe("PROCESSING");
  });

  it("dispatch: clear 4xx rejection -> FAILED and cycle back in the queue", async () => {
    const p = await processing();
    gw.createPayout.mockRejectedValue(new RazorpayXError("Insufficient balance", 400, true));
    expect(await dispatchPayoutRecord(p.record.id)).toBe("FAILED");
    expect((await recOf(p.record.id)).status).toBe("FAILED");
    expect((await entOf(p.entry.id)).payoutStatus).toBe("QUEUED_FOR_PAYMENT");
  });

  it("dispatch: timeout / 5xx (outcome unknown) -> stays PROCESSING, NOT failed (money may have moved)", async () => {
    const p = await processing();
    gw.createPayout.mockRejectedValue(new RazorpayXError("timeout", null, false));
    expect(await dispatchPayoutRecord(p.record.id)).toBe("UNKNOWN");
    expect((await recOf(p.record.id)).status).toBe("PROCESSING");
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PROCESSING");
  });

  it("dispatch: no approved bank account -> FAILED, nothing sent", async () => {
    const p = await processing();
    await prisma.bankAccount.update({ where: { teacherId: p.teacher.id }, data: { status: "PENDING" } });
    expect(await dispatchPayoutRecord(p.record.id)).toBe("FAILED");
    expect(gw.createPayout).not.toHaveBeenCalled();
  });

  it("dispatch: a record that is not PROCESSING is never sent", async () => {
    const p = await processing();
    await prisma.payoutRecord.update({ where: { id: p.record.id }, data: { status: "SUCCESS" } });
    expect(await dispatchPayoutRecord(p.record.id)).toBe("FAILED");
    expect(gw.createPayout).not.toHaveBeenCalled();
  });

  it("reconcile: old record with a payout id asks the gateway and settles", async () => {
    const p = await processing({ ageMinutes: 30, payoutId: "pout_r1" });
    gw.fetchPayout.mockResolvedValue({ id: "pout_r1", status: "processed", reference_id: p.record.id });
    const r = await reconcileProcessingPayouts();
    expect(r.checked).toBeGreaterThanOrEqual(1);
    expect(gw.fetchPayout).toHaveBeenCalledWith("pout_r1");
    expect((await recOf(p.record.id)).status).toBe("SUCCESS");
  });

  it("reconcile: old record with no payout id is re-sent with the same idempotency key", async () => {
    const p = await processing({ ageMinutes: 30 });
    gw.createPayout.mockResolvedValue({ id: "pout_r2", status: "processed", reference_id: p.record.id });
    await reconcileProcessingPayouts();
    expect(gw.createPayout.mock.calls[0][0].idempotencyKey).toBe(p.record.id);
    expect((await recOf(p.record.id)).status).toBe("SUCCESS");
  });

  it("reconcile: a young record (under 10 min) is left alone", async () => {
    const p = await processing({ ageMinutes: 1 });
    await reconcileProcessingPayouts();
    expect(gw.createPayout).not.toHaveBeenCalled();
    expect(gw.fetchPayout).not.toHaveBeenCalled();
    expect((await recOf(p.record.id)).status).toBe("PROCESSING");
  });
});

describe("RazorpayX webhook route gate", () => {
  const post = async (body: string, sig?: string) => {
    const { POST } = await import("@/app/api/webhooks/razorpayx/route");
    return POST(
      new Request("http://localhost/api/webhooks/razorpayx", {
        method: "POST",
        body,
        headers: sig === undefined ? {} : { "x-razorpay-signature": sig },
      }),
    );
  };

  it("missing signature -> 400", async () => {
    expect((await post("{}")).status).toBe(400);
  });
  it("wrong signature -> 400", async () => {
    expect((await post("{}", "deadbeef")).status).toBe(400);
  });
  it("tampered body (signature of a different body) -> 400", async () => {
    expect((await post('{"event":"payout.processed"}', sign("{}"))).status).toBe(400);
  });
  it("signed but not JSON -> 400", async () => {
    expect((await post("not json", sign("not json"))).status).toBe(400);
  });
  it("signed, not a payout event -> 200 ignored", async () => {
    const b = JSON.stringify({ event: "account.updated" });
    const res = await post(b, sign(b));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(true);
  });
  it("signed payout.processed for a real record -> settles it", async () => {
    const p = await processing();
    const b = JSON.stringify({
      event: "payout.processed",
      payload: { payout: { entity: { id: "pout_wh", status: "processed", reference_id: p.record.id, utr: "UWH" } } },
    });
    const res = await post(b, sign(b));
    expect(res.status).toBe(200);
    expect((await recOf(p.record.id)).status).toBe("SUCCESS");
    // delivered twice: still one payment, still 200
    expect((await post(b, sign(b))).status).toBe(200);
    expect((await entOf(p.entry.id)).payoutStatus).toBe("PAID");
  });
  it("signed payout.processed for an unknown record -> 200 (no retry storm), nothing created", async () => {
    const b = JSON.stringify({
      event: "payout.processed",
      payload: { payout: { entity: { id: "pout_ghost", status: "processed", reference_id: "ghost" } } },
    });
    const res = await post(b, sign(b));
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe("UNKNOWN_RECORD");
  });
});
'@

W "tests/integration/cronRoutes.test.ts" @'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

const ROUTES = [
  "demo-reminders",
  "due-date-reminders",
  "enrollment-auto-lapse",
  "payout-reconcile",
  "resolve-sessions",
  "session-reminders",
] as const;

const SECRET = "test-cron-secret";

async function call(name: string, headers: Record<string, string> = {}) {
  const mod = (await import(`@/app/api/cron/${name}/route`)) as { GET: (r: Request) => Promise<Response> };
  return mod.GET(new Request(`http://localhost/api/cron/${name}`, { headers }));
}

beforeAll(async () => {
  await resetDb();
});
beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  process.env.RAZORPAYX_ENABLED = "false";
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.env.CRON_SECRET = SECRET;
});

describe.each(ROUTES)("cron route /api/cron/%s", (name) => {
  it("no Authorization header -> 401", async () => {
    expect((await call(name)).status).toBe(401);
  });
  it("wrong secret -> 401", async () => {
    expect((await call(name, { authorization: "Bearer nope" })).status).toBe(401);
  });
  it("secret without the 'Bearer ' prefix -> 401", async () => {
    expect((await call(name, { authorization: SECRET })).status).toBe(401);
  });
  it("CRON_SECRET not set on the server -> 401 (fails closed), even with a header", async () => {
    delete process.env.CRON_SECRET;
    expect((await call(name, { authorization: "Bearer " })).status).toBe(401);
    expect((await call(name, { authorization: "Bearer undefined" })).status).toBe(401);
  });
  it("correct secret -> 200 and success:true on an empty database", async () => {
    const res = await call(name, { authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
  it("running it twice in a row is safe (idempotent)", async () => {
    const h = { authorization: `Bearer ${SECRET}` };
    expect((await call(name, h)).status).toBe(200);
    expect((await call(name, h)).status).toBe(200);
  });
});

describe("payout-reconcile when RazorpayX is off", () => {
  it("is skipped on purpose, never calls the gateway", async () => {
    const res = await call("payout-reconcile", { authorization: `Bearer ${SECRET}` });
    const body = await res.json();
    expect(body.skipped).toMatch(/RAZORPAYX_ENABLED/);
  });
});
'@

W "tests/integration/ownership.test.ts" @'
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
'@

W "tests/integration/firstPayments.test.ts" @'
import { createHmac } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Razorpay is never called: orders.create records what it was asked, orders.fetch answers from a store.
const rz = vi.hoisted(() => ({
  orders: {} as Record<string, Record<string, unknown>>,
  created: [] as Record<string, unknown>[],
  seq: 0,
}));

vi.mock("@/lib/razorpay", async (orig) => {
  const actual = await orig<typeof import("@/lib/razorpay")>();
  return {
    ...actual,
    getRazorpayClient: () => ({
      orders: {
        create: async (body: Record<string, unknown>) => {
          const id = `order_new_${++rz.seq}`;
          const order = { id, status: "created", currency: "INR", ...body };
          rz.created.push(order);
          rz.orders[id] = order;
          return order;
        },
        fetch: async (id: string) => rz.orders[id],
      },
    }),
  };
});

import { createEnrollmentOrder } from "@/features/parent/server/enrollment/order";
import { reconcileEnrollmentFromWebhook } from "@/features/parent/server/enrollment/webhook";
import {
  createDemoCouponPurchaseOrder,
  reconcileDemoCouponPurchaseFromWebhook,
  verifyDemoCouponPurchase,
} from "@/features/parent/server/demoCoupon/purchase";
import { reconcileDemoBookingFromWebhook } from "@/features/parent/server/demoCoupon/bookingPayment";
import {
  createWalletTopupOrder,
  reconcileWalletTopupFromWebhook,
  verifyWalletTopup,
} from "@/features/shared/server/wallet/topup";
import { rupeesToPaise } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const KEY_SECRET = "test-key-secret";
const checkoutSig = (orderId: string, payId: string) =>
  createHmac("sha256", KEY_SECRET).update(`${orderId}|${payId}`).digest("hex");

const DAY = 86_400_000;
const istDate = (offsetDays: number) => new Date(Date.now() + 5.5 * 3_600_000 + offsetDays * DAY).toISOString().slice(0, 10);

let seq = 0;
const nextPay = () => `pay_fp_${++seq}`;

/** A parent, student, approved teacher and an APPROVED priced course, ready to be enrolled in. */
async function enrollable() {
  const f = await createSessionFixture({});
  await prisma.course.update({
    where: { id: f.course.id },
    data: { status: "APPROVED", price: 500, duration: "1 Hour", subject: "Maths", grade: "5" },
  });
  return f;
}
const input = (f: Awaited<ReturnType<typeof enrollable>>, startOffset = 2) => ({
  studentId: f.student.id,
  teacherId: f.teacher.id,
  courseId: f.course.id,
  cycleStartDate: istDate(startOffset),
  scheduleDays: [0, 1, 2, 3, 4, 5, 6],
  scheduleTime: "10:00",
});

beforeAll(async () => {
  process.env.RAZORPAY_TEST_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_TEST_KEY_ID = "rzp_test_dummy";
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Enrollment: first payment", () => {
  it("creating the order writes NOTHING to the database", async () => {
    const f = await enrollable();
    const before = await prisma.enrollment.count({ where: { parentId: f.parent.id } });
    const { order, pricing } = await createEnrollmentOrder(f.parent.id, input(f));
    expect(order.id).toBeTruthy();
    expect(pricing.totalAmount).toBe(pricing.sessionsPerMonth * 500);
    expect(await prisma.enrollment.count({ where: { parentId: f.parent.id } })).toBe(before);
  });

  it("order creation refuses a start date in the past", async () => {
    const f = await enrollable();
    await expect(createEnrollmentOrder(f.parent.id, input(f, -3))).rejects.toThrow(/past/i);
  });

  it("order creation refuses another parent's student", async () => {
    const f = await enrollable();
    const other = await createSessionFixture({});
    await expect(
      createEnrollmentOrder(f.parent.id, { ...input(f), studentId: other.student.id }),
    ).rejects.toThrow();
  });

  it("order creation refuses a course that is not APPROVED", async () => {
    const f = await enrollable();
    await prisma.course.update({ where: { id: f.course.id }, data: { status: "DRAFT" } });
    await expect(createEnrollmentOrder(f.parent.id, input(f))).rejects.toThrow();
  });

  it("paid webhook -> one enrollment + cycle 1 + invoice; a duplicate delivery adds nothing", async () => {
    const f = await enrollable();
    const { order } = await createEnrollmentOrder(f.parent.id, input(f));
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid" };

    const pay = nextPay();
    const e1 = await reconcileEnrollmentFromWebhook(order.id as string, pay);
    const e2 = await reconcileEnrollmentFromWebhook(order.id as string, pay);

    expect(e1).not.toBeNull();
    expect(e2?.id).toBe(e1?.id);
    expect(await prisma.enrollment.count({ where: { razorpayOrderId: order.id as string } })).toBe(1);
    const cycles = await prisma.enrollmentCycle.findMany({ where: { enrollmentId: e1!.id } });
    expect(cycles).toHaveLength(1);
    expect(cycles[0].cycleNumber).toBe(1);
    expect(Number(e1!.amountPaid)).toBe(Number(cycles[0].price));
    expect(await prisma.invoice.count({ where: { razorpayOrderId: order.id as string } })).toBe(1);
  });

  it("unpaid order -> nothing is created", async () => {
    const f = await enrollable();
    const { order } = await createEnrollmentOrder(f.parent.id, input(f));
    expect(await reconcileEnrollmentFromWebhook(order.id as string, nextPay())).toBeNull();
    expect(await prisma.enrollment.count({ where: { razorpayOrderId: order.id as string } })).toBe(0);
  });

  it("order of another kind -> ignored", async () => {
    rz.orders["order_other"] = { id: "order_other", status: "paid", amount: 10000, notes: { kind: "wallet_topup" } };
    expect(await reconcileEnrollmentFromWebhook("order_other", nextPay())).toBeNull();
  });

  it("amount that does not match the re-computed price -> refused, nothing created", async () => {
    const f = await enrollable();
    const { order } = await createEnrollmentOrder(f.parent.id, input(f));
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid", amount: 100 };
    expect(await reconcileEnrollmentFromWebhook(order.id as string, nextPay())).toBeNull();
    expect(await prisma.enrollment.count({ where: { razorpayOrderId: order.id as string } })).toBe(0);
  });

  it("a payment that cleared just before midnight still creates the enrollment (start-date rule is order-time only)", async () => {
    const f = await enrollable();
    const { order } = await createEnrollmentOrder(f.parent.id, input(f, 1));
    // The same order is verified after its start date has passed: rewrite the stamped start date into the past.
    const notes = { ...(rz.orders[order.id as string].notes as Record<string, unknown>), cycleStartDate: istDate(-1) };
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid", notes };
    const e = await reconcileEnrollmentFromWebhook(order.id as string, nextPay());
    expect(e).not.toBeNull();
  });

  it("referral: the referrer is paid once when the referee's FIRST enrollment is reconciled", async () => {
    const f = await enrollable();
    const referrer = await createSessionFixture({});
    // The referee must have no enrollment yet (the reward is for the first one only).
    const referee = await prisma.parentProfile.create({
      data: { cognitoSub: `ref-${Date.now()}`, firstName: "Ref", lastName: "Eree", phone: "9000000001", email: `ref-${Date.now()}@test.local` },
    });
    const kid = await prisma.student.create({ data: { parentId: referee.id, firstName: "Kid", lastName: "Ree" } });
    await prisma.referral.create({
      data: { referrerParentId: referrer.parent.id, refereeParentId: referee.id, code: "REFTEST9", status: "PENDING", rewardAmount: 500 },
    });
    const { order } = await createEnrollmentOrder(referee.id, { ...input(f), studentId: kid.id });
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid" };
    await reconcileEnrollmentFromWebhook(order.id as string, nextPay());
    await reconcileEnrollmentFromWebhook(order.id as string, nextPay());
    const w = await prisma.wallet.findUnique({ where: { parentId: referrer.parent.id } });
    expect(Number(w?.balance ?? 0)).toBe(500);
    const r = await prisma.referral.findUniqueOrThrow({ where: { refereeParentId: referee.id } });
    expect(r.status).toBe("REWARDED");
  });
});

describe("Wallet top-up", () => {
  it("order creation writes nothing and refuses amounts outside the limits", async () => {
    const f = await createSessionFixture({});
    await expect(createWalletTopupOrder(f.parent.id, 50)).rejects.toThrow();
    await expect(createWalletTopupOrder(f.parent.id, 25001)).rejects.toThrow();
    await expect(createWalletTopupOrder(f.parent.id, Number.NaN)).rejects.toThrow();
    const { order } = await createWalletTopupOrder(f.parent.id, 500);
    expect(order.id).toBeTruthy();
    const w = await prisma.wallet.findUnique({ where: { parentId: f.parent.id } });
    expect(await prisma.walletTransaction.count({ where: { walletId: w?.id ?? "none" } })).toBe(0);
  });

  async function paidTopup(parentId: string, amount: number) {
    const { order } = await createWalletTopupOrder(parentId, amount);
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid" };
    return order.id as string;
  }

  it("verify: good signature credits exactly the amount; a retry does not credit twice", async () => {
    const f = await createSessionFixture({});
    const orderId = await paidTopup(f.parent.id, 500);
    const pay = nextPay();
    const input = { razorpayOrderId: orderId, razorpayPaymentId: pay, razorpaySignature: checkoutSig(orderId, pay) };
    await verifyWalletTopup(f.parent.id, input);
    await verifyWalletTopup(f.parent.id, input);
    const w = await prisma.wallet.findUniqueOrThrow({ where: { parentId: f.parent.id } });
    expect(Number(w.balance)).toBe(500);
    expect(await prisma.walletTransaction.count({ where: { walletId: w.id } })).toBe(1);
    expect(await prisma.invoice.count({ where: { razorpayOrderId: orderId } })).toBe(1);
  });

  it("verify: bad signature -> refused, nothing credited", async () => {
    const f = await createSessionFixture({});
    const orderId = await paidTopup(f.parent.id, 500);
    await expect(
      verifyWalletTopup(f.parent.id, { razorpayOrderId: orderId, razorpayPaymentId: nextPay(), razorpaySignature: "bad" }),
    ).rejects.toThrow();
    const w = await prisma.wallet.findUnique({ where: { parentId: f.parent.id } });
    expect(Number(w?.balance ?? 0)).toBe(0);
    expect(await prisma.walletTransaction.count({ where: { walletId: w?.id ?? "none" } })).toBe(0);
  });

  it("verify: another parent's order cannot be claimed", async () => {
    const f = await createSessionFixture({});
    const thief = await createSessionFixture({});
    const orderId = await paidTopup(f.parent.id, 500);
    const pay = nextPay();
    await expect(
      verifyWalletTopup(thief.parent.id, { razorpayOrderId: orderId, razorpayPaymentId: pay, razorpaySignature: checkoutSig(orderId, pay) }),
    ).rejects.toThrow();
    const w = await prisma.wallet.findUnique({ where: { parentId: thief.parent.id } });
    expect(Number(w?.balance ?? 0)).toBe(0);
  });

  it("verify: unpaid order -> refused (402)", async () => {
    const f = await createSessionFixture({});
    const { order } = await createWalletTopupOrder(f.parent.id, 500);
    const pay = nextPay();
    await expect(
      verifyWalletTopup(f.parent.id, { razorpayOrderId: order.id as string, razorpayPaymentId: pay, razorpaySignature: checkoutSig(order.id as string, pay) }),
    ).rejects.toThrow(/complete|status/i);
  });

  it("webhook (tab closed): paid order credits once; second delivery adds nothing; verify afterwards adds nothing", async () => {
    const f = await createSessionFixture({});
    const orderId = await paidTopup(f.parent.id, 1000);
    const pay = nextPay();
    await reconcileWalletTopupFromWebhook(orderId, pay);
    await reconcileWalletTopupFromWebhook(orderId, pay);
    await verifyWalletTopup(f.parent.id, { razorpayOrderId: orderId, razorpayPaymentId: pay, razorpaySignature: checkoutSig(orderId, pay) });
    const w = await prisma.wallet.findUniqueOrThrow({ where: { parentId: f.parent.id } });
    expect(Number(w.balance)).toBe(1000);
  });

  it("webhook: unpaid or non-wallet order -> nothing credited", async () => {
    const f = await createSessionFixture({});
    const { order } = await createWalletTopupOrder(f.parent.id, 500);
    expect(await reconcileWalletTopupFromWebhook(order.id as string, nextPay())).toBeNull();
    rz.orders["order_wrongkind"] = { id: "order_wrongkind", status: "paid", amount: 50000, notes: { kind: "enrollment" } };
    expect(await reconcileWalletTopupFromWebhook("order_wrongkind", nextPay())).toBeNull();
  });

  it("webhook: Razorpay charged LESS than the top-up amount -> refused, nothing credited", async () => {
    const f = await createSessionFixture({});
    const { order } = await createWalletTopupOrder(f.parent.id, 1000);
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid", amount: rupeesToPaise(100) };
    await expect(reconcileWalletTopupFromWebhook(order.id as string, nextPay())).rejects.toThrow();
    const w = await prisma.wallet.findUnique({ where: { parentId: f.parent.id } });
    expect(Number(w?.balance ?? 0)).toBe(0);
  });
});

describe("Demo coupon purchase", () => {
  it("quantity outside 1-20 is refused at order time", async () => {
    const f = await createSessionFixture({});
    await expect(createDemoCouponPurchaseOrder(f.parent.id, 0)).rejects.toThrow();
    await expect(createDemoCouponPurchaseOrder(f.parent.id, 21)).rejects.toThrow();
  });

  it("webhook: paid order adds coupons once (2 free + 3 bought = 5); duplicate delivery adds nothing", async () => {
    const f = await createSessionFixture({});
    const { order, amount } = await createDemoCouponPurchaseOrder(f.parent.id, 3);
    expect(amount).toBe(300);
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid" };
    const pay = nextPay();
    await reconcileDemoCouponPurchaseFromWebhook(order.id as string, pay);
    await reconcileDemoCouponPurchaseFromWebhook(order.id as string, pay);
    const c = await prisma.demoCoupon.findUniqueOrThrow({ where: { parentId: f.parent.id } });
    expect(c.totalIssued).toBe(5);
    expect(await prisma.demoCouponPurchase.count({ where: { parentId: f.parent.id } })).toBe(1);
    expect(await prisma.invoice.count({ where: { razorpayOrderId: order.id as string } })).toBe(1);
  });

  it("webhook: wrong amount -> refused, no coupons", async () => {
    const f = await createSessionFixture({});
    const { order } = await createDemoCouponPurchaseOrder(f.parent.id, 3);
    rz.orders[order.id as string] = { ...rz.orders[order.id as string], status: "paid", amount: 100 };
    expect(await reconcileDemoCouponPurchaseFromWebhook(order.id as string, nextPay())).toBeNull();
    expect(await prisma.demoCouponPurchase.count({ where: { parentId: f.parent.id } })).toBe(0);
  });

  it("verify: bad signature refused; good signature then retry credits once", async () => {
    const f = await createSessionFixture({});
    const { order } = await createDemoCouponPurchaseOrder(f.parent.id, 2);
    const id = order.id as string;
    rz.orders[id] = { ...rz.orders[id], status: "paid" };
    await expect(
      verifyDemoCouponPurchase(f.parent.id, { quantity: 2, razorpayOrderId: id, razorpayPaymentId: nextPay(), razorpaySignature: "bad" }),
    ).rejects.toThrow();
    const pay = nextPay();
    const good = { quantity: 2, razorpayOrderId: id, razorpayPaymentId: pay, razorpaySignature: checkoutSig(id, pay) };
    await verifyDemoCouponPurchase(f.parent.id, good);
    await verifyDemoCouponPurchase(f.parent.id, good);
    expect(await prisma.demoCouponPurchase.count({ where: { parentId: f.parent.id } })).toBe(1);
    expect((await prisma.demoCoupon.findUniqueOrThrow({ where: { parentId: f.parent.id } })).totalIssued).toBe(4);
  });
});

describe("Paid demo booking webhook", () => {
  it("non-demo / unpaid / unknown orders create no booking", async () => {
    rz.orders["order_demo_unpaid"] = { id: "order_demo_unpaid", status: "created", amount: 10000, notes: { kind: "demo_booking" } };
    rz.orders["order_demo_wrongkind"] = { id: "order_demo_wrongkind", status: "paid", amount: 10000, notes: { kind: "wallet_topup" } };
    expect(await reconcileDemoBookingFromWebhook("order_demo_unpaid", nextPay())).toBeNull();
    expect(await reconcileDemoBookingFromWebhook("order_demo_wrongkind", nextPay())).toBeNull();
    expect(await prisma.demoBooking.count()).toBe(0);
  });
});
'@

W "tests/integration/sessionFlowExtras.test.ts" @'
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OutcomeConfirmation } from "@prisma/client";
import { acceptExpiredConfirmations } from "@/features/shared/server/sessionConfirmation.service";
import { closeDueCycles, releaseDueCyclePayouts } from "@/features/shared/server/cycleClose/batch";
import { applyApprovedLeaveToSessions } from "@/features/shared/server/leaveShift.service";
import { cancelForLateReschedule } from "@/features/shared/server/rescheduleRequest/propose";
import { resolveSession } from "@/features/shared/server/sessionResolve/resolve";
import { runSessionFollowUps } from "@/features/shared/server/sessionFollowUp.service";
import { waiveTeacherStrike } from "@/features/shared/server/teacherStrike.service";
import {
  confirmSessionOutcome,
  endSession,
  joinSession,
  reportSessionOutcome,
  startSession,
} from "@/features/shared/server/sessionFlow.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

const H = 3_600_000;
const DAY = 24 * H;
const now = new Date();
const D0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

beforeAll(async () => {
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const sess = (id: string) => prisma.classSession.findUniqueOrThrow({ where: { id } });

/** Class that ended `endedHoursAgo` ago and was COMPLETED then. */
async function finished(endedHoursAgo: number) {
  const startsAt = new Date(Date.now() - (endedHoursAgo + 1) * H);
  const f = await createSessionFixture({
    startsAt,
    teacherStartedAt: startsAt,
    teacherEndedAt: new Date(startsAt.getTime() + H),
    studentJoinedAt: startsAt,
  });
  await resolveSession(f.session.id);
  await runSessionFollowUps(f.session.id);
  // The 48 h clock runs from when the outcome became final (resolvedAt), so backdate it to the class end.
  await prisma.classSession.update({
    where: { id: f.session.id },
    data: { resolvedAt: new Date(Date.now() - endedHoursAgo * H), completedAt: new Date(Date.now() - endedHoursAgo * H) },
  });
  return f;
}

describe("Start / Join / End (Google Meet off)", () => {
  it("Start is refused more than 10 minutes before the class", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * H) });
    await expect(startSession(f.session.id, f.teacher.id)).rejects.toMatchObject({ status: 409 });
    expect((await sess(f.session.id)).teacherStartedAt).toBeNull();
  });

  it("Join is refused before the window too", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * H) });
    await expect(joinSession(f.session.id, f.parent.id)).rejects.toMatchObject({ status: 409 });
  });

  it("Start inside the window records the time once; a second tap keeps the first time", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 5 * 60_000) });
    await startSession(f.session.id, f.teacher.id);
    const first = (await sess(f.session.id)).teacherStartedAt;
    expect(first).not.toBeNull();
    await startSession(f.session.id, f.teacher.id);
    expect((await sess(f.session.id)).teacherStartedAt?.getTime()).toBe(first!.getTime());
  });

  it("End before Start is refused", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() - 5 * 60_000) });
    await expect(endSession(f.session.id, f.teacher.id)).rejects.toMatchObject({ status: 409 });
  });

  it("End with no student yet, early in the class -> refused (student may still join)", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() - 2 * 60_000) });
    await startSession(f.session.id, f.teacher.id);
    await expect(endSession(f.session.id, f.teacher.id)).rejects.toMatchObject({ status: 409 });
  });

  it("another parent / another teacher cannot Start or Join (service level)", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() - 5 * 60_000) });
    const other = await createSessionFixture({});
    await expect(startSession(f.session.id, other.teacher.id)).rejects.toThrow();
    await expect(joinSession(f.session.id, other.parent.id)).rejects.toThrow();
  });

  it("full happy path: Start, Join, End after the overlap -> COMPLETED", async () => {
    // Class began 40 min ago, 60 min long: both present 40 min = 67% (>= 50%).
    const f = await createSessionFixture({ startsAt: new Date(Date.now() - 40 * 60_000) });
    await startSession(f.session.id, f.teacher.id);
    await joinSession(f.session.id, f.parent.id);
    await endSession(f.session.id, f.teacher.id);
    // Rule: overlap is measured inside the scheduled window, so re-run resolve after the end time has passed.
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { endsAt: new Date(Date.now() - 1000), teacherEndedAt: new Date(Date.now() - 1000) },
    });
    await resolveSession(f.session.id);
    const s = await sess(f.session.id);
    expect(["COMPLETED", "NEEDS_REVIEW"]).toContain(s.status);
    expect(s.teacherStartedAt).not.toBeNull();
    expect(s.studentJoinedAt).not.toBeNull();
  });

  it("a Meet outage (enabled but no credentials) never blocks Start / Join", async () => {
    const saved = { ...process.env };
    process.env.GOOGLE_MEET_ENABLED = "true";
    delete process.env.GOOGLE_MEET_SA_CLIENT_EMAIL;
    delete process.env.GOOGLE_MEET_SA_PRIVATE_KEY;
    delete process.env.GOOGLE_MEET_ORGANIZER_EMAIL;
    try {
      const f = await createSessionFixture({ startsAt: new Date(Date.now() - 5 * 60_000) });
      await startSession(f.session.id, f.teacher.id);
      await joinSession(f.session.id, f.parent.id);
      const s = await sess(f.session.id);
      expect(s.teacherStartedAt).not.toBeNull();
      expect(s.studentJoinedAt).not.toBeNull();
      expect(s.meetingUri).toBeNull();
    } finally {
      process.env.GOOGLE_MEET_ENABLED = saved.GOOGLE_MEET_ENABLED ?? "false";
    }
  });
});

describe("48-hour parent confirmation", () => {
  it("auto-accepts only classes whose window (48 h from the outcome) has passed", async () => {
    const old = await finished(60);
    const fresh = await finished(10);
    await acceptExpiredConfirmations(new Date());
    const o = await sess(old.session.id);
    const n = await sess(fresh.session.id);
    expect(o.confirmation).toBe(OutcomeConfirmation.AUTO_ACCEPTED);
    expect(o.settledAt).not.toBeNull();
    expect(n.confirmation).toBeNull();
    expect(n.settledAt).toBeNull();
  });

  it("auto-accept never overrides a parent's report", async () => {
    const f = await finished(60);
    await prisma.classSession.update({
      where: { id: f.session.id },
      data: { confirmation: OutcomeConfirmation.REPORTED, reportedAt: new Date(), reportNote: "teacher left early" },
    });
    await acceptExpiredConfirmations(new Date());
    const s = await sess(f.session.id);
    expect(s.confirmation).toBe(OutcomeConfirmation.REPORTED);
    expect(s.settledAt).toBeNull();
  });

  it("'All good' settles the class; tapping again is harmless", async () => {
    const f = await finished(5);
    await confirmSessionOutcome(f.session.id, f.parent.id);
    await confirmSessionOutcome(f.session.id, f.parent.id);
    const s = await sess(f.session.id);
    expect(s.confirmation).toBe(OutcomeConfirmation.PARENT_ACCEPTED);
    expect(s.settledAt).not.toBeNull();
  });

  it("confirm is refused while the class is not over", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 5 * H) });
    await expect(confirmSessionOutcome(f.session.id, f.parent.id)).rejects.toThrow();
  });

  it("another parent cannot confirm or report my class", async () => {
    const f = await finished(5);
    const other = await createSessionFixture({});
    await expect(confirmSessionOutcome(f.session.id, other.parent.id)).rejects.toThrow();
    await expect(reportSessionOutcome(f.session.id, other.parent.id, "I am not the parent")).rejects.toThrow();
    expect((await sess(f.session.id)).settledAt).toBeNull();
  });

  it("report: too-short note refused; a good note holds the class for Admin and blocks 'All good'", async () => {
    const f = await finished(5);
    await expect(reportSessionOutcome(f.session.id, f.parent.id, "x")).rejects.toMatchObject({ status: 400 });
    await reportSessionOutcome(f.session.id, f.parent.id, "The teacher only stayed ten minutes.");
    const s = await sess(f.session.id);
    expect(s.confirmation).toBe(OutcomeConfirmation.REPORTED);
    expect(s.settledAt).toBeNull();
    await expect(confirmSessionOutcome(f.session.id, f.parent.id)).rejects.toMatchObject({ status: 409 });
  });

  it("report after the 48 h window is refused (already accepted)", async () => {
    const f = await finished(60);
    await acceptExpiredConfirmations(new Date());
    await expect(
      reportSessionOutcome(f.session.id, f.parent.id, "Too late but I still want to complain."),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("Batch runners: closeDueCycles / releaseDueCyclePayouts", () => {
  /** A cycle whose 4 sessions are all COMPLETED (outcome final) `hoursAgo` hours ago. */
  async function allFinal(hoursAgo = 60) {
    const f = await createSessionFixture({});
    const ended = new Date(Date.now() - hoursAgo * H);
    const done = (startsAt: Date) => ({
      status: "COMPLETED" as const,
      startsAt,
      endsAt: new Date(startsAt.getTime() + H),
      scheduledDate: utcMidnight(startsAt),
      completedAt: ended,
      resolvedAt: ended,
      followUpAppliedAt: ended,
    });
    await prisma.classSession.update({ where: { id: f.session.id }, data: done(new Date(ended.getTime() - H)) });
    for (let i = 1; i < 4; i++) {
      await prisma.classSession.create({
        data: {
          enrollmentId: f.enrollment.id, teacherId: f.teacher.id, studentId: f.student.id, parentId: f.parent.id,
          scheduledTime: "10:00", cycleId: f.cycle.id, sessionNumber: i + 1, lengthMinutes: 60,
          ...done(new Date(ended.getTime() - (i + 1) * DAY)),
        },
      });
    }
    return f;
  }

  it("closes a fully-final cycle once; a second run closes nothing", async () => {
    const f = await allFinal();
    const r1 = await closeDueCycles();
    expect(r1.closed).toBeGreaterThanOrEqual(1);
    expect((await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } })).status).toBe("CLOSED");
    const r2 = await closeDueCycles();
    expect(r2.closed).toBe(0);
  });

  it("does not close a cycle that still has a class to come", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 5 * H) });
    await closeDueCycles();
    expect((await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } })).status).toBe("OPEN");
  });

  it("releases the payout only after every session is settled; once", async () => {
    const f = await allFinal(10); // outcome final 10 h ago: the 48 h window is still open
    const rowsOf = () => prisma.tuitionLedgerEntry.findMany({ where: { enrollmentId: f.enrollment.id } });
    await closeDueCycles();
    expect((await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } })).status).toBe("CLOSED");
    await releaseDueCyclePayouts();
    expect(await rowsOf()).toHaveLength(0); // window open, nothing settled -> held

    const later = new Date(Date.now() + 49 * H); // window now over
    // Same order as the real sweep: accept expired confirmations, then release.
    await acceptExpiredConfirmations(later);
    await releaseDueCyclePayouts(later);
    const rows = await rowsOf();
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].monthlyTeacherPay)).toBe(1400);
    expect(Number(rows[0].profits)).toBe(600);

    await releaseDueCyclePayouts(later);
    expect(await rowsOf()).toHaveLength(1); // running again adds nothing
  });

  it("a cycle whose window already passed releases on the first run", async () => {
    const f = await allFinal(60);
    await closeDueCycles();
    await releaseDueCyclePayouts();
    expect(await prisma.tuitionLedgerEntry.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
  });
});

describe("Strikes", () => {
  async function noShowStrike() {
    const f = await createSessionFixture({ studentJoinedAt: new Date(Date.now() - 2.9 * H) });
    await resolveSession(f.session.id);
    await runSessionFollowUps(f.session.id);
    const strike = await prisma.teacherStrike.findFirstOrThrow({ where: { classSessionId: f.session.id } });
    return { ...f, strike };
  }
  const admin = { sub: "admin-test-sub", name: "Test Admin", email: "admin@test.local" };

  it("waiver needs a real reason", async () => {
    const f = await noShowStrike();
    await expect(waiveTeacherStrike({ strikeId: f.strike.id, reason: "no", admin })).rejects.toMatchObject({ status: 400 });
    expect((await prisma.teacherStrike.findUniqueOrThrow({ where: { id: f.strike.id } })).waivedAt).toBeNull();
  });

  it("waiver is recorded, the strike row stays, and a second waiver is refused", async () => {
    const f = await noShowStrike();
    await waiveTeacherStrike({ strikeId: f.strike.id, reason: "Teacher had a family emergency", admin });
    const s = await prisma.teacherStrike.findUniqueOrThrow({ where: { id: f.strike.id } });
    expect(s.waivedAt).not.toBeNull();
    expect(s.waiveReason).toContain("emergency");
    expect(s.waivedBySub).toBe("admin-test-sub");
    await expect(
      waiveTeacherStrike({ strikeId: f.strike.id, reason: "Trying to waive it again", admin }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("unknown strike -> 404", async () => {
    await expect(
      waiveTeacherStrike({ strikeId: "does-not-exist", reason: "A perfectly good reason", admin }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("Teacher reschedule under 4 h = cancel + strike", () => {
  it("class 2 h away: becomes a teacher CANCELLED class with a strike and a make-up", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * H) });
    await cancelForLateReschedule({ sessionId: f.session.id, teacherId: f.teacher.id, reason: "Car broke down" });
    await runSessionFollowUps(f.session.id);
    const s = await sess(f.session.id);
    expect(s.status).toBe("CANCELLED");
    expect(s.cancelledByRole).toBe("TEACHER");
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(1);
    expect(await prisma.classSession.count({ where: { makeupForSessionId: f.session.id } })).toBe(1);
  });

  it("class 10 h away: refused (a normal reschedule request should be used), nothing cancelled", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 10 * H) });
    await expect(
      cancelForLateReschedule({ sessionId: f.session.id, teacherId: f.teacher.id }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await sess(f.session.id)).status).toBe("SCHEDULED");
  });

  it("another teacher cannot cancel it this way", async () => {
    const f = await createSessionFixture({ startsAt: new Date(Date.now() + 2 * H) });
    const other = await createSessionFixture({});
    await expect(
      cancelForLateReschedule({ sessionId: f.session.id, teacherId: other.teacher.id }),
    ).rejects.toThrow();
    expect((await sess(f.session.id)).status).toBe("SCHEDULED");
  });
});

describe("EXCUSED class gets a make-up after a long leave (extended deadline)", () => {
  it("leave runs past day 45: the cycle gets an extended deadline and the make-up lands after the leave", async () => {
    const classAt = new Date(D0 + 3 * DAY + 4.5 * H);
    const f = await createSessionFixture({ startsAt: classAt });
    const leaveEnd = new Date(D0 + 50 * DAY);
    const leave = await prisma.leaveRequest.create({
      data: { teacherId: f.teacher.id, startDate: new Date(D0), endDate: leaveEnd, reason: "Long test leave", status: "APPROVED" },
    });
    const r = await applyApprovedLeaveToSessions(leave.id);
    expect(r.excused).toBe(1);
    await runSessionFollowUps(f.session.id);

    const cycle = await prisma.enrollmentCycle.findUniqueOrThrow({ where: { id: f.cycle.id } });
    expect(cycle.extendedDeadline).not.toBeNull();
    expect(await prisma.teacherStrike.count({ where: { classSessionId: f.session.id } })).toBe(0);

    const makeup = await prisma.classSession.findFirst({ where: { makeupForSessionId: f.session.id } });
    expect(makeup).not.toBeNull();
    expect(makeup!.startsAt!.getTime()).toBeGreaterThan(leaveEnd.getTime());
  });
});
'@

W "tests/integration/featureAreas.test.ts" @'
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ComplaintDepartment, ComplainantRole } from "@prisma/client";
import { ChatError, getRoomForAccess, listMessages, sendMessage } from "@/features/chat/server/chat.service";
import { reportChatMessage } from "@/features/chat/server/chatReport.service";
import {
  createComplaint,
  listComplaintsForAdmin,
  listComplaintsForDepartment,
  listComplaintsForRaiser,
  respondToComplaint,
} from "@/features/shared/server/complaint.service";
import { createClassRequest, cancelClassRequestByParent } from "@/features/shared/server/classRequest.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

beforeAll(async () => {
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function room() {
  const f = await createSessionFixture({});
  const chat = await prisma.chatRoom.create({
    data: {
      enrollmentId: f.enrollment.id,
      parentId: f.parent.id,
      teacherId: f.teacher.id,
      courseId: f.course.id,
      studentId: f.student.id,
    },
  });
  return { ...f, chat };
}

describe("Chat: phone masking", () => {
  it("a phone number is masked in the saved message; the original is kept for Admin only", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "Call me on 9876543210 please" });
    expect(msg.body).not.toContain("9876543210");
    expect(msg.containsPhoneNumber).toBe(true);
    const row = await prisma.chatMessage.findUniqueOrThrow({ where: { id: msg.id } });
    expect(row.originalBody).toContain("9876543210");
    expect(row.body).not.toContain("9876543210");
    expect(await prisma.activityLog.count({ where: { action: "CHAT_PHONE_NUMBER_FLAGGED" } })).toBeGreaterThanOrEqual(1);
  });

  it("the other side's message list never contains the number or the original", async () => {
    const f = await room();
    await sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "my number is +91 98765 43210" });
    const list = await listMessages(f.chat.id); // what Parent/Teacher routes return (no includeOriginal)
    const text = JSON.stringify(list);
    expect(text).not.toContain("98765");
    expect(text).not.toContain("originalBody");
  });

  it("an ordinary message is stored as typed, with no flag", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "TEACHER", senderId: f.teacher.id, body: "Please revise chapter 5 (pages 12-20)." });
    expect(msg.body).toBe("Please revise chapter 5 (pages 12-20).");
    expect(msg.containsPhoneNumber).toBe(false);
    const row = await prisma.chatMessage.findUniqueOrThrow({ where: { id: msg.id } });
    expect(row.originalBody).toBeNull();
  });

  it("empty, over-long and someone-else's-room messages are refused", async () => {
    const f = await room();
    const other = await createSessionFixture({});
    await expect(sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "   " })).rejects.toBeInstanceOf(ChatError);
    await expect(sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "x".repeat(4001) })).rejects.toBeInstanceOf(ChatError);
    await expect(sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: other.parent.id, body: "hi" })).rejects.toMatchObject({ status: 403 });
  });

  it("no message can be sent once the enrollment is cancelled/rejected", async () => {
    const f = await room();
    await prisma.enrollment.update({ where: { id: f.enrollment.id }, data: { status: "CANCELLED" } });
    await expect(sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "hello" })).rejects.toMatchObject({ status: 409 });
  });

  it("a parent cannot read another parent's room", async () => {
    const f = await room();
    const other = await createSessionFixture({});
    await expect(getRoomForAccess(f.chat.id, { role: "PARENT", actorId: other.parent.id })).rejects.toMatchObject({ status: 403 });
    await expect(getRoomForAccess(f.chat.id, { role: "PARENT", actorId: f.parent.id })).resolves.toBeTruthy();
  });
});

describe("Chat: reporting a message", () => {
  it("the other party can report once; a second report is refused", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "TEACHER", senderId: f.teacher.id, body: "Pay me directly instead" });
    await reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: f.parent.id, reason: "asks for off-platform payment" });
    await expect(
      reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: f.parent.id }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await prisma.chatMessageReport.count({ where: { chatMessageId: msg.id } })).toBe(1);
  });

  it("you cannot report your own message", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "hello there" });
    await expect(
      reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: f.parent.id }),
    ).rejects.toBeInstanceOf(ChatError);
  });

  it("someone outside the room cannot report in it", async () => {
    const f = await room();
    const stranger = await createSessionFixture({});
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "TEACHER", senderId: f.teacher.id, body: "hello there" });
    await expect(
      reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: stranger.parent.id }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("reporting still works after the enrollment ended (a safety action)", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "TEACHER", senderId: f.teacher.id, body: "last message" });
    await prisma.enrollment.update({ where: { id: f.enrollment.id }, data: { status: "CANCELLED" } });
    const r = await reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: f.parent.id });
    expect(r.id).toBeTruthy();
  });
});

describe("Complaints: department routing", () => {
  it("a complaint goes to the chosen department and only that department's staff (and Admin) see it", async () => {
    const f = await createSessionFixture({});
    const c = await createComplaint({
      raiserId: f.parent.id, raiserRole: ComplainantRole.PARENT,
      subject: "Charged twice", description: "I was charged twice for the same class.", department: "ACCOUNTS",
    });
    expect(c.department).toBe("ACCOUNTS");
    expect(c.status).toBe("OPEN");
    expect((await listComplaintsForDepartment(ComplaintDepartment.ACCOUNTS)).map((x) => x.id)).toContain(c.id);
    expect((await listComplaintsForDepartment(ComplaintDepartment.HR)).map((x) => x.id)).not.toContain(c.id);
    expect((await listComplaintsForDepartment(ComplaintDepartment.IT)).map((x) => x.id)).not.toContain(c.id);
    expect((await listComplaintsForAdmin()).map((x) => x.id)).toContain(c.id);
  });

  it("a raiser only sees their own complaints", async () => {
    const a = await createSessionFixture({});
    const b = await createSessionFixture({});
    const ca = await createComplaint({ raiserId: a.parent.id, raiserRole: ComplainantRole.PARENT, subject: "A's issue", description: "details", department: "IT" });
    const mine = await listComplaintsForRaiser(b.parent.id, ComplainantRole.PARENT);
    expect(mine.map((x) => x.id)).not.toContain(ca.id);
  });

  it("validation: missing subject, missing description, unknown department, over-long subject", async () => {
    const f = await createSessionFixture({});
    const base = { raiserId: f.parent.id, raiserRole: ComplainantRole.PARENT, subject: "s", description: "d", department: "HR" };
    await expect(createComplaint({ ...base, subject: "  " })).rejects.toThrow();
    await expect(createComplaint({ ...base, description: "" })).rejects.toThrow();
    await expect(createComplaint({ ...base, department: "SALES" })).rejects.toThrow();
    await expect(createComplaint({ ...base, subject: "x".repeat(151) })).rejects.toThrow();
  });

  it("staff of another department cannot move a complaint; Admin and its own department can; resolved is final", async () => {
    const f = await createSessionFixture({});
    const c = await createComplaint({ raiserId: f.parent.id, raiserRole: ComplainantRole.PARENT, subject: "Tech issue", description: "app crashes", department: "IT" });
    await expect(respondToComplaint({ complaintId: c.id, scopeDepartment: ComplaintDepartment.HR, status: "RESOLVED" })).rejects.toMatchObject({ status: 404 });
    expect((await prisma.complaint.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("OPEN");

    await respondToComplaint({ complaintId: c.id, scopeDepartment: ComplaintDepartment.IT, status: "IN_PROGRESS" });
    const done = await respondToComplaint({ complaintId: c.id, status: "RESOLVED", adminNote: "Fixed in the next release" });
    expect(done.status).toBe("RESOLVED");
    expect(done.resolvedAt).not.toBeNull();
    await expect(respondToComplaint({ complaintId: c.id, status: "CLOSED" })).rejects.toMatchObject({ status: 409 });
  });
});

describe("Class requests", () => {
  const base = (studentId?: string) => ({
    studentId,
    title: "Need a French tutor",
    subject: "French",
    grade: "Grade 5",
    preferredDays: [1, 3],
    preferredTime: "17:00",
    description: "Beginner level, conversational.",
  });

  it("a valid request starts as PENDING_REVIEW", async () => {
    const f = await createSessionFixture({});
    const r = await createClassRequest(f.parent.id, base(f.student.id));
    expect(r.status).toBe("PENDING_REVIEW");
  });

  it("grade, days and a valid time are required", async () => {
    const f = await createSessionFixture({});
    await expect(createClassRequest(f.parent.id, { ...base(f.student.id), grade: null })).rejects.toThrow();
    await expect(createClassRequest(f.parent.id, { ...base(f.student.id), preferredDays: [] })).rejects.toThrow();
    await expect(createClassRequest(f.parent.id, { ...base(f.student.id), preferredTime: "25:99" })).rejects.toThrow();
  });

  it("another parent's child cannot be attached", async () => {
    const f = await createSessionFixture({});
    const other = await createSessionFixture({});
    await expect(createClassRequest(f.parent.id, base(other.student.id))).rejects.toMatchObject({ status: 404 });
  });

  it("at most 5 requests can wait for review at once", async () => {
    const f = await createSessionFixture({});
    for (let i = 0; i < 5; i++) await createClassRequest(f.parent.id, base(f.student.id));
    await expect(createClassRequest(f.parent.id, base(f.student.id))).rejects.toThrow();
  });

  it("a parent can cancel their own pending request but not someone else's", async () => {
    const f = await createSessionFixture({});
    const other = await createSessionFixture({});
    const r = await createClassRequest(f.parent.id, base(f.student.id));
    await expect(cancelClassRequestByParent(other.parent.id, r.id)).rejects.toThrow();
    await cancelClassRequestByParent(f.parent.id, r.id);
    expect((await prisma.classRequest.findUniqueOrThrow({ where: { id: r.id } })).status).not.toBe("PENDING_REVIEW");
  });
});
'@

# ---- 2. Run everything --------------------------------------------------------------------------
Step "Type check (tsc --noEmit)"            { npx tsc --noEmit }
Step "Unit + security tests (npm test)"     { npm test }
Step "Integration tests (all 19 files)"     { npm run test:integration }

# ---- 3. Static checks (things tests cannot cover) -----------------------------------------------
Write-Host "`n=== Static checks ===" -ForegroundColor Cyan

if (Select-String -Path "src/middleware.ts" -Pattern "jwtDecode" -Quiet) {
  Write-Host "[CHECK] middleware.ts still only DECODES the token (page gating only, not data). Decide if that is acceptable." -ForegroundColor Yellow
} else { Write-Host "[ok] middleware.ts no longer uses jwtDecode" -ForegroundColor Green }

if (Select-String -Path "docker-compose.yml" -Pattern "^\s*scheduler:" -Quiet) {
  Write-Host "[ok] docker-compose.yml has a scheduler service" -ForegroundColor Green
  $sched = Get-Content "scheduler/scheduler.sh" | Out-String
  Get-ChildItem "src/app/api/cron" -Directory | ForEach-Object {
    if ($sched -match ("hit " + [regex]::Escape($_.Name))) { Write-Host "[ok] scheduler calls $($_.Name)" -ForegroundColor Green }
    else { Write-Host "[CHECK] scheduler.sh does NOT call $($_.Name)" -ForegroundColor Yellow }
  }
  Write-Host "       On the server, confirm it really runs:  docker compose logs --tail 50 scheduler" -ForegroundColor Gray
} else { Write-Host "[CHECK] no scheduler service in docker-compose.yml" -ForegroundColor Yellow }

$old = git show 63cb2de:sweep-output.txt 2>$null
if ($LASTEXITCODE -eq 0 -and $old) {
  $hits = $old | Select-String -Pattern "eyJ[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{12,}|secret|password" -CaseSensitive:$false
  if ($hits) { Write-Host "[CHECK] commit 63cb2de sweep-output.txt contains possible secrets: $($hits.Count) matching lines. Review it." -ForegroundColor Yellow }
  else { Write-Host "[ok] commit 63cb2de sweep-output.txt has no token/secret-looking text" -ForegroundColor Green }
} else { Write-Host "[info] could not read sweep-output.txt from 63cb2de (not in this clone)" -ForegroundColor Gray }

Write-Host "`nGit status (nothing is committed or pushed by this script):" -ForegroundColor Cyan
git status --short
$unpushed = git log second-origin/master..HEAD --oneline 2>$null
if ($unpushed) { Write-Host "Unpushed commits:`n$unpushed" -ForegroundColor Yellow } else { Write-Host "No unpushed commits." -ForegroundColor Green }

# ---- 4. Summary ---------------------------------------------------------------------------------
Write-Host "`n==================== SUMMARY ====================" -ForegroundColor Cyan
Write-Host "Full output saved to: $log"
if ($fails.Count -eq 0) { Write-Host "ALL AUTOMATED STEPS PASSED" -ForegroundColor Green }
else {
  Write-Host ("FAILED: " + ($fails -join "; ")) -ForegroundColor Red
  Write-Host "A failure may be a wrong test assumption, not an app bug. Read the rule in the code before changing anything (guide 6.1)." -ForegroundColor Yellow
}

}
catch {
  Write-Host "`n$($_.Exception.Message)" -ForegroundColor Red
}
finally {
  Write-Host "`nLog file: $log"
  Read-Host "Press Enter to close"
}
