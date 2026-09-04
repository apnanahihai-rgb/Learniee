import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { listLedgerEntries, getLedgerSummary } from "@/features/shared/server/tuitionLedger.service";

/**
 * GET — the real, persisted Tuition Ledger (one row per completed
 * cycle) plus its summary. Restricted to Admin and Accounts logins,
 * signature-verified (money-adjacent, 06-OPEN-DECISIONS.md #21).
 */
export async function GET() {
  const auth = await requireAdminOrAccounts();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await listLedgerEntries();
    const summary = await getLedgerSummary(entries);

    return NextResponse.json({ entries, summary });
  } catch (error) {
    console.error("Accounts ledger GET error:", error);
    return NextResponse.json({ error: "Failed to load the ledger." }, { status: 500 });
  }
}
