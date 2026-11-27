import { redirect } from "next/navigation";

import {
  buildTabUrl,
  type RawSearchParams,
} from "@/features/shared/utils/tabRedirect";

/**
 * Kept so old links and bookmarks keep working. A teacher's group classes now
 * live in the "Group classes" tab of /teacher/my-classes (create one from
 * Courses → Create course, class type "Group").
 */
export default async function TeacherGroupClassesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  redirect(buildTabUrl("/teacher/my-classes", "groups", await searchParams));
}
