# Parent feature

Home for parent-specific components, hooks, server logic, and types.

**Already extracted here** (not inline in `src/app/parent/**`
anymore): the course dashboard's `CourseCard`, everything under
`components/layout/` (`ParentNavbar`/`ParentSidebar`), and the whole
"manage children" flow (`AddChildCard`, `ChildAvatar`,
`ChildFocusCard`, `LearnerSwitcher`, `StudentCard`, `StudentForm`,
plus `hooks/useStudents.ts` / `useStudentProfile.ts` and
`server/student.service.ts`).

**Still worth extracting**, past the project's ~150-200 line
convention (`02-ARCHITECTURE.md`'s "Splitting large files" section):

- `src/app/parent/page.tsx` (~185 lines) - the dashboard's hero
  banner + "Active courses" grid could split into
  `components/DashboardHero.tsx` + reuse the existing `CourseCard`
  grid logic as its own component.
- `src/app/parent/students/[studentId]/page.tsx` (~174 lines) - a
  single student's detail/edit view; a natural
  `components/StudentDetailView.tsx` extraction, following the same
  pattern `StudentForm.tsx` already established for the "new
  student" page.

Onboarding steps 1-3 (`src/app/parent/onboarding/step{1,2,3}/`) are
all still comfortably under the line-count convention and don't need
splitting yet.
