import { redirect } from "next/navigation";

import {
  buildTabUrl,
  type RawSearchParams,
} from "@/features/shared/utils/tabRedirect";

/**
 * Kept so old links, bookmarks and notification deep links keep working.
 * The content now lives in the "reschedule" tab of /parent/calendar; any other query
 * parameters are passed along.
 */
export default async function ParentRescheduleRedirectPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  redirect(buildTabUrl("/parent/calendar", "reschedule", await searchParams));
}
