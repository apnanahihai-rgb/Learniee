/**
 * One-off: import a cleaned monthly accounts sheet (parent/teacher
 * bookkeeping tracked outside the app) into `ManualAccountEntry`. Fully
 * isolated from real Enrollment/EnrollmentCycle/ClassSession/
 * TuitionLedgerEntry data — see the model's doc-comment in
 * schema.prisma. Safe to re-run: deletes the batch first (by
 * `accountMonth` + `sourceBatch`), so re-importing a corrected file
 * never duplicates rows.
 *
 * Usage:
 *   npx tsx scripts/manual-accounts/import.ts <path-to-json> <YYYY-MM> [sourceBatch]
 *
 * Example (this repo's Sept 2026 sheet):
 *   npx tsx scripts/manual-accounts/import.ts scripts/manual-accounts/2026-09.json 2026-09 ACC_SEPT
 *
 * The JSON file is an array of rows with these keys (all optional except
 * none are required — every field can be null):
 *   branch, enteredDate, bankDate (ISO "YYYY-MM-DD" or null),
 *   parentName, childName, parentPaymentStatus, numberOfMonths,
 *   cyclePeriodLabel, ratePerSession, monthlyAmount, totalAmount,
 *   ccc, mcc, tcc, dueDateLabel, teacherName, subject,
 *   teacherRatePerSession, teacherAmount, profit, teacherPaymentStatus,
 *   meetingLink, remarks, board, grade, slot
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ManualAccountRow {
  branch?: string | null;
  enteredDate?: string | null;
  bankDate?: string | null;
  parentName?: string | null;
  childName?: string | null;
  parentPaymentStatus?: string | null;
  numberOfMonths?: number | null;
  cyclePeriodLabel?: string | null;
  ratePerSession?: number | null;
  monthlyAmount?: number | null;
  totalAmount?: number | null;
  ccc?: number | null;
  mcc?: number | null;
  tcc?: number | null;
  dueDateLabel?: string | null;
  teacherName?: string | null;
  subject?: string | null;
  teacherRatePerSession?: number | null;
  teacherAmount?: number | null;
  profit?: number | null;
  teacherPaymentStatus?: string | null;
  meetingLink?: string | null;
  remarks?: string | null;
  board?: string | null;
  grade?: string | null;
  slot?: string | null;
}

function toDateOrNull(v?: string | null): Date | null {
  return v ? new Date(v) : null;
}

async function main() {
  const [, , filePath, monthArg, sourceBatchArg] = process.argv;

  if (!filePath || !monthArg) {
    throw new Error(
      "Usage: npx tsx scripts/manual-accounts/import.ts <path-to-json> <YYYY-MM> [sourceBatch]",
    );
  }
  if (!/^\d{4}-\d{2}$/.test(monthArg)) {
    throw new Error(`Invalid month "${monthArg}" — expected YYYY-MM, e.g. 2026-09.`);
  }

  const accountMonth = new Date(`${monthArg}-01T00:00:00.000Z`);
  const sourceBatch = sourceBatchArg ?? filePath;

  const raw = readFileSync(filePath, "utf-8");
  const rows: ManualAccountRow[] = JSON.parse(raw);

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("JSON file must be a non-empty array of rows.");
  }

  // Re-running the same batch replaces it rather than duplicating it.
  const deleted = await prisma.manualAccountEntry.deleteMany({
    where: { accountMonth, sourceBatch },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} existing row(s) for this batch before re-import.`);
  }

  const result = await prisma.manualAccountEntry.createMany({
    data: rows.map((r) => ({
      accountMonth,
      sourceBatch,
      branch: r.branch ?? null,
      enteredDate: toDateOrNull(r.enteredDate),
      bankDate: toDateOrNull(r.bankDate),
      parentName: r.parentName ?? null,
      childName: r.childName ?? null,
      parentPaymentStatus: r.parentPaymentStatus ?? null,
      numberOfMonths: r.numberOfMonths ?? null,
      cyclePeriodLabel: r.cyclePeriodLabel ?? null,
      ratePerSession: r.ratePerSession ?? null,
      monthlyAmount: r.monthlyAmount ?? null,
      totalAmount: r.totalAmount ?? null,
      ccc: r.ccc ?? null,
      mcc: r.mcc ?? null,
      tcc: r.tcc ?? null,
      dueDateLabel: r.dueDateLabel ?? null,
      teacherName: r.teacherName ?? null,
      subject: r.subject ?? null,
      teacherRatePerSession: r.teacherRatePerSession ?? null,
      teacherAmount: r.teacherAmount ?? null,
      profit: r.profit ?? null,
      teacherPaymentStatus: r.teacherPaymentStatus ?? null,
      meetingLink: r.meetingLink ?? null,
      remarks: r.remarks ?? null,
      board: r.board ?? null,
      grade: r.grade ?? null,
      slot: r.slot ?? null,
    })),
  });

  console.log(`Imported ${result.count} row(s) into ManualAccountEntry for ${monthArg} (batch "${sourceBatch}").`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
