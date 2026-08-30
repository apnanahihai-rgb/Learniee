import { redirect } from "next/navigation";

/**
 * "Your Children" now lives directly on the parent dashboard
 * (/parent) instead of a separate list page. This route is kept
 * only so any existing links/bookmarks to /parent/students don't
 * 404 - it just forwards to the dashboard.
 */
export default function StudentsRedirectPage() {
  redirect("/parent");
}