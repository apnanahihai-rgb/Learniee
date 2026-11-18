/** Small display helpers for the Teacher Courses page. */

/** "9" / "8-10" → "Grade 9" / "Grade 8-10"; anything else is shown as stored. */
export function gradeLabel(grade: string | null | undefined): string {
  const g = (grade ?? "").trim();
  if (!g) return "";
  return /^\d/.test(g) ? `Grade ${g}` : g;
}

/** "₹500" from a price stored as text ("500", "500.00"); null when there is no usable price. */
export function formatPrice(price: string | number | null | undefined): string | null {
  const n = Number(price);
  return Number.isFinite(n) && n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : null;
}

/** "14 Aug 2026". */
export function formatCreated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
