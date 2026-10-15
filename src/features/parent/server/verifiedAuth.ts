/**
 * Kept so existing imports keep working. `requireParentId()` itself is now
 * signature-verified (Oct 15, 2026, 06-OPEN-DECISIONS.md #21), so this is
 * just the same function under its old name.
 */
export { requireParentId as requireVerifiedParentId } from "@/features/parent/server/auth";
