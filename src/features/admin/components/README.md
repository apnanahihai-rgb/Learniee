# Admin feature

Reserved for admin-specific components extracted from `src/app/admin/**`.

Currently `src/app/admin/teachers/page.tsx` is a large monolithic page.
When you next touch it, pull its pieces out here, e.g.:

- `components/TeacherApprovalTable.tsx`
- `components/TeacherApprovalRow.tsx`
- `hooks/useTeacherApprovals.ts` (data fetching / mutations)

Keep the `src/app/admin/**/page.tsx` file itself thin — it should just
compose components from this folder and pass server data down.
