/**
 * Kept so existing imports keep working. `requireTeacherId()` itself is now
 * signature-verified and approval-gated (Oct 15, 2026,
 * 06-OPEN-DECISIONS.md #21), so this is just the same function under its
 * old name.
 */
export { requireTeacherId as requireVerifiedTeacherId } from "@/features/teacher/server/auth";
