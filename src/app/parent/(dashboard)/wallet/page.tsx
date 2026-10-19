import { redirect } from "next/navigation";

import {
  buildTabUrl,
  type RawSearchParams,
} from "@/features/shared/utils/tabRedirect";

/**
 * Kept so old links, bookmarks and notification deep links keep working.
 * The content now lives in the "wallet" tab of /parent/payments; any other query
 * parameters are passed along.
 */
export default async function ParentWalletRedirectPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  redirect(buildTabUrl("/parent/payments", "wallet", await searchParams));
}
