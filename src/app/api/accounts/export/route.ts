import { NextResponse } from "next/server";

import { requireAdminOrAccounts } from "@/lib/verifyAdmin";
import { buildAccountsExportWorkbook } from "@/features/accounts/server/export.service";

// exceljs needs Node Buffer/stream APIs — must not run on the Edge runtime.
export const runtime = "nodejs";

/**
 * GET — downloads the Accounts export workbook (Transactions + Sessions
 * (Planned) sheets). Restricted to Admin and Accounts staff logins only.
 */
export async function GET() {
  const auth = await requireAdminOrAccounts();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const buffer = await buildAccountsExportWorkbook();
    const filename = `learniee-accounts-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Accounts export GET error:", error);
    return NextResponse.json({ error: "Failed to generate export." }, { status: 500 });
  }
}
