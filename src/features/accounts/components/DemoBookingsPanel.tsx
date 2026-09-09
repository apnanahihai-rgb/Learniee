import type { DemoBookingRow } from "@/features/accounts/server/export.service";

interface DemoBookingsPanelProps {
  rows: DemoBookingRow[];
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** Paid (3rd+) demo bookings — outside the tuition cycle, split out of the old combined dashboard. */
export default function DemoBookingsPanel({ rows }: DemoBookingsPanelProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Demo Bookings (Paid)</h2>
        <p className="text-xs text-gray-400 mt-1">
          Paid demo sessions (2 free per parent, then ₹100 + surcharge if international).
        </p>
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
            {rows.map((d, i) => (
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
            {rows.length === 0 && (
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
  );
}
