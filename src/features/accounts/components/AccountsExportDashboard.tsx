import type { TuitionLedgerRow, DemoBookingRow } from "@/features/accounts/server/export.service";

interface AccountsExportDashboardProps {
  heading: string;
  subheading: string;
  summary: {
    totalTuitionRevenue: number;
    totalDemoRevenue: number;
    totalEnrollments: number;
    dueSoonCount: number;
  };
  ledgerRows: TuitionLedgerRow[];
  demoRows: DemoBookingRow[];
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function StatusPill({ status }: { status: string }) {
  const label = status.replaceAll("_", " ").toLowerCase();
  const color =
    status === "ACTIVE"
      ? "bg-green-100 text-green-700"
      : status === "REJECTED" || status === "CANCELLED"
        ? "bg-red-100 text-red-700"
        : status === "LAPSED"
          ? "bg-gray-200 text-gray-600"
          : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${color}`}>
      {label}
    </span>
  );
}

export default function AccountsExportDashboard({
  heading,
  subheading,
  summary,
  ledgerRows,
  demoRows,
}: AccountsExportDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-purple-600">{heading}</h1>
            <p className="text-sm text-gray-500 mt-1">{subheading}</p>
          </div>
          <a
            href="/api/accounts/export"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm"
          >
            ⬇ Download Excel (.xlsx)
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <p className="text-sm text-gray-500">Tuition Revenue</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {currency.format(summary.totalTuitionRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <p className="text-sm text-gray-500">Demo Revenue</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {currency.format(summary.totalDemoRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <p className="text-sm text-gray-500">Enrollments</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{summary.totalEnrollments}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <p className="text-sm text-gray-500">Due Within 5 Days</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.dueSoonCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Tuition Ledger</h2>
            <p className="text-xs text-gray-400">
              CCC/MCC/TCC and highlighted rows — see note below the table.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-100 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-3">Transaction Date</th>
                  <th className="px-3 py-3">Parent</th>
                  <th className="px-3 py-3">Child</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">No. Months</th>
                  <th className="px-3 py-3 text-right">Rate</th>
                  <th className="px-3 py-3 text-right">Monthly Rate</th>
                  <th className="px-3 py-3 text-right">Total Amount</th>
                  <th className="px-3 py-3 text-right">CCC</th>
                  <th className="px-3 py-3 text-right">MCC</th>
                  <th className="px-3 py-3 text-right">TCC</th>
                  <th className="px-3 py-3">Due Date</th>
                  <th className="px-3 py-3">Teacher</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3 text-right">Teacher Rate</th>
                  <th className="px-3 py-3 text-right">Monthly Teacher Pay</th>
                  <th className="px-3 py-3 text-right">Profits</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((r) => (
                  <tr
                    key={r.enrollmentId}
                    className={`border-t ${r.isDueSoon ? "bg-yellow-50" : ""}`}
                  >
                    <td className="px-3 py-2">{dateFmt.format(r.transactionDate)}</td>
                    <td className="px-3 py-2">{r.parentName}</td>
                    <td className="px-3 py-2">{r.childName}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-3 py-2 text-right">{r.noOfMonths}</td>
                    <td className="px-3 py-2 text-right">{currency.format(r.rate)}</td>
                    <td className="px-3 py-2 text-right">{currency.format(r.monthlyRate)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {currency.format(r.totalAmount)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-400">{r.ccc || "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{r.mcc || "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{r.tcc || "—"}</td>
                    <td className="px-3 py-2">
                      {dateFmt.format(r.dueDate)}
                      {r.isDueSoon && (
                        <span className="ml-1 text-yellow-700 text-xs font-medium">⚠ soon</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.teacherName}</td>
                    <td className="px-3 py-2">{r.subject}</td>
                    <td className="px-3 py-2 text-right">{currency.format(r.teacherRate)}</td>
                    <td className="px-3 py-2 text-right">{currency.format(r.monthlyTeacherPay)}</td>
                    <td className="px-3 py-2 text-right text-green-700 font-medium">
                      {currency.format(r.profits)}
                    </td>
                  </tr>
                ))}
                {ledgerRows.length === 0 && (
                  <tr>
                    <td colSpan={17} className="px-4 py-8 text-center text-gray-400">
                      No enrollments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t text-xs text-gray-400">
            CCC/MCC/TCC show as &quot;—&quot; because class-by-class tracking isn&apos;t built yet
            (no <code>ClassSession</code> model). Rows highlighted yellow are due within 5 days —
            a real automatic reminder still needs the Notification Center (not built yet); this
            table and the Excel export are the current stand-in.
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Demo Bookings (Paid)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-100 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Parent</th>
                  <th className="px-3 py-3">Child</th>
                  <th className="px-3 py-3">Teacher</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Razorpay Payment ID</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {demoRows.map((d, i) => (
                  <tr key={d.razorpayPaymentId || i} className="border-t">
                    <td className="px-3 py-2">{dateFmt.format(d.date)}</td>
                    <td className="px-3 py-2">{d.parentName}</td>
                    <td className="px-3 py-2">{d.childName}</td>
                    <td className="px-3 py-2">{d.teacherName}</td>
                    <td className="px-3 py-2">{d.subject}</td>
                    <td className="px-3 py-2 text-right">{currency.format(d.amount)}</td>
                    <td className="px-3 py-2">{d.razorpayPaymentId}</td>
                    <td className="px-3 py-2">{d.status}</td>
                  </tr>
                ))}
                {demoRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No paid demo bookings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
