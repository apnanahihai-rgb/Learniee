import { redirect } from "next/navigation";

import {
  buildTabUrl,
  type RawSearchParams,
} from "@/features/shared/utils/tabRedirect";

/**
 * Kept so old links, bookmarks and notification deep links keep working.
 * The content now lives in the "chat" tab of /teacher/my-classes; any other query
 * parameters are passed along.
 */
export default async function TeacherChatRedirectPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  redirect(buildTabUrl("/teacher/my-classes", "chat", await searchParams));
}
