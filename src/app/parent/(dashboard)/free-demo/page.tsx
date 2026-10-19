import { redirect } from "next/navigation";

import {
  buildTabUrl,
  type RawSearchParams,
} from "@/features/shared/utils/tabRedirect";

/**
 * Kept so old links, bookmarks and notification deep links keep working.
 * The content now lives in the "demos" tab of /parent/my-classes; any other query
 * parameters are passed along.
 */
export default async function ParentFreeDemoRedirectPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  redirect(buildTabUrl("/parent/my-classes", "demos", await searchParams));
}
