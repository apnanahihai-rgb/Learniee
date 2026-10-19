import { redirect } from "next/navigation";

import {
  buildTabUrl,
  type RawSearchParams,
} from "@/features/shared/utils/tabRedirect";

/**
 * Kept so old links, bookmarks and notification deep links keep working.
 * The content now lives in the "enrollments" tab of /teacher/requests; any other query
 * parameters are passed along.
 */
export default async function TeacherEnrollmentsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  redirect(buildTabUrl("/teacher/requests", "enrollments", await searchParams));
}
