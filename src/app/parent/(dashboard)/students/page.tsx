import { redirect } from "next/navigation";

/**
 * The student list is now the "Students" tab of Account. Kept as a
 * redirect so old links and bookmarks to /parent/students don't 404.
 */
export default function StudentsRedirectPage() {
  redirect("/parent/account?tab=students");
}
