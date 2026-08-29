# Admin feature

Home for admin-specific components, hooks, server logic, and types.

**Already extracted here:** `TeacherApprovalCard`, `CourseApprovalCard`,
`TeacherPersonalSection`, `TeacherProfessionalSection`,
`TeacherDocumentsStatusSection`, `shared/ReviewSection` (a base the
Teacher/Course review cards both build on), plus
`hooks/useTeachersList.ts` / `useCoursesList.ts` and
`server/course.service.ts`. `src/app/admin/teachers/page.tsx` and
`src/app/admin/courses/page.tsx` are both already thin (~50 lines
each) - they just compose these.

**Still worth extracting**, past the project's ~150-200 line
convention (`02-ARCHITECTURE.md`'s "Splitting large files" section):

- `src/app/admin/users/page.tsx` (~315 lines, well past the
  threshold) - the "Manage Users" list/view/delete flow. A natural
  split: `components/UserTable.tsx` + `components/UserDetailPanel.tsx`
  + a `hooks/useAdminUsers.ts` for the fetch/delete mutations,
  following the same shape `useTeachersList.ts` already established.

Keep the `src/app/admin/**/page.tsx` file itself thin — it should just
compose components from this folder and pass server data down.
