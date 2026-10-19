import { redirect } from "next/navigation";

import {
  buildTabUrl,
  type RawSearchParams,
} from "@/features/shared/utils/tabRedirect";

/**
 * Kept so old links, bookmarks and notification deep links keep working.
 * The content now lives in the "leave" tab of /teacher/calendar; any other query
 * parameters are passed along.
 */
export default async function TeacherLeaveRedirectPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  redirect(buildTabUrl("/teacher/calendar", "leave", await searchParams));
}
