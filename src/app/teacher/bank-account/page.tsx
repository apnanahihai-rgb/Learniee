import { redirect } from "next/navigation";

import {
  buildTabUrl,
  type RawSearchParams,
} from "@/features/shared/utils/tabRedirect";

/**
 * Kept so old links, bookmarks and notification deep links keep working.
 * The content now lives in the "bank" tab of /teacher/earnings; any other query
 * parameters are passed along.
 */
export default async function TeacherBankAccountRedirectPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  redirect(buildTabUrl("/teacher/earnings", "bank", await searchParams));
}
