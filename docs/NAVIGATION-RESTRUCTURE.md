# Learniee — Navigation & Naming Restructure

**Status:** proposal (Oct 19, 2026). Based on the sidebar code at master `dd3139a`.
**Scope:** menus, page grouping and wording only. No database, API or URL changes.

---

## 1. What is wrong today

Counted from `ParentSidebar.tsx` and `TeacherSidebar.tsx`:

- Parent sidebar: **19 items** in 4 groups. Teacher sidebar: **21 items** in 5 groups.
- The same idea lives in several places:

| Idea | Parent today | Teacher today |
|---|---|---|
| Demo | Free Demo page, Demo feedback page | Demo page |
| A class (one session) | My Classes, Calendar, Reschedule, class Join page | My Classes, Calendar, Reschedule, class Start page |
| Homework | Homework page **and** inside My Classes | HW & Tests page **and** inside Enrollments |
| Chat | Chat page **and** inside My Classes | Chat page |
| Resources | Resources page | Resources page **and** inside Enrollments |
| Enrollments | hidden inside My Classes (old route redirects) | Enrollments page **and** My Classes |
| Money | Payments, Wallet, Referral (3 items) | Earnings, Rate Calculator, Bank Account (3 items) |
| Account | Profile, Settings, Students (3 places) | Profile, Settings (2 places) |

- **Dead links** (no `page.tsx` found, so they likely 404):
  - Parent → `Teacher` (`/parent/teachers` has only `[teacherId]`)
  - Parent → `Reviews` (`/parent/reviews`)
  - Teacher → `Go Live` (`/teacher/go-live`)
- **Mixed words:** course, class, session, lecture, enrollment, demo are used for overlapping things.

---

## 2. Rules for the new structure

1. **One home per thing.** If it is about a class, it lives under *My Classes*.
2. **Menu follows the journey.** Parent: Find → Try → Learn → Pay → Account. Teacher: Teach → Respond → Earn → Account.
3. **Hubs with tabs.** A menu item opens one page with tabs instead of many menu items.
4. **Routes stay.** Old URLs keep working (redirect), so notifications and bookmarks never break.
5. **One word per thing** (glossary below).

---

## 3. Glossary (use everywhere in the UI)

| Word | Means | Do not call it |
|---|---|---|
| **Course** | What a teacher offers (subject, grade, price) | class, lecture |
| **Class** | One live session on one date/time | lecture, session |
| **Demo** | A trial class, before enrolling | free class |
| **My Classes** | Courses the child is enrolled in (replaces "Enrollment" in the UI) | enrollments |
| **Month / Week** | One paid cycle of a course | cycle |

---

## 4. Parent — new menu (8 items)

| Menu item | Opens (tabs) | Replaces today |
|---|---|---|
| **Home** | Dashboard | Home |
| **Find a Course** | Courses · Teachers · Request a class | Courses, Teacher, Request Class |
| **My Classes** | Courses · **Demos** · Homework · Chat · Resources · Certificates | My Classes, Free Demo, Homework, Chat, Resources |
| **Calendar** | All classes **and** demos in one schedule · Reschedule requests | Calendar, Reschedule |
| **Payments** | Payments & invoices · Wallet · Referral | Payments, Wallet, Referral |
| **Blogs** | Reader | Blogs |
| **Account** | Profile · Students · Settings | Profile, Settings, Students |
| **Help** | Complaints | Complain |

Notes:
- **Demo booking** starts from a course page ("Book demo"). The coupon balance and upcoming/past demos show in *My Classes → Demos*.
- **Reviews** are written from the course page (that is where the rule "only while enrolled" already applies). Remove the dead menu item.
- Homework / Chat / Resources tabs are **per course**: pick the course first, then the tab (same as the current `my-classes/[enrollmentId]` page).

---

## 5. Teacher — new menu (9 items)

| Menu item | Opens (tabs) | Replaces today |
|---|---|---|
| **Home** | Dashboard | Home |
| **My Courses** | Courses · Vacancies | Course Management, Vacancy |
| **My Classes** | Students/courses → per student: Classes · Homework · Resources · Chat · Certificates | My Classes, Enrollments (after approval), HW & Tests, Resources, Certificate Management |
| **Requests** | Enrollments · Demos · Reschedules *(things waiting for your answer, with a count badge)* | Enrollments (pending), Demo, Reschedule |
| **Calendar** | Schedule · Leave | Calendar, Leave |
| **Earnings** | Earnings · Bank account · Rate calculator | Earnings, Bank Account, Rate Calculator |
| **Blogs** | Write / read | Blogs |
| **Account** | Profile · Settings | Profile, Settings |
| **Help** | Complaints | Complain |

Notes:
- **Requests** is the one place a teacher checks for "what needs my reply".
- **Go Live** is removed from the menu (it is deferred scope; do not build it now).
- Chat stays reachable from *My Classes → student → Chat*. If teachers want a global inbox, keep a top-level **Chat** item (decision below).

---

## 6. Old route → new place

Routes stay. Old ones redirect to the new hub tab.

**Parent**

| Old route | Goes to |
|---|---|
| `/parent/free-demo` | `/parent/my-classes?tab=demos` |
| `/parent/homework-tests` | `/parent/my-classes?tab=homework` |
| `/parent/chat` (+ `[roomId]`) | `/parent/my-classes?tab=chat` |
| `/parent/resources` | `/parent/my-classes?tab=resources` |
| `/parent/reschedule` | `/parent/calendar?tab=reschedule` |
| `/parent/request-class` | `/parent/courses?tab=request` |
| `/parent/wallet`, `/parent/referral` | `/parent/payments?tab=wallet` / `?tab=referral` |
| `/parent/profile`, `/parent/settings`, `/parent/students` | `/parent/account?tab=…` |
| `/parent/enrollments` | already redirects to `/parent/my-classes` |

**Teacher**

| Old route | Goes to |
|---|---|
| `/teacher/course-management`, `/teacher/vacancy` | `/teacher/courses?tab=…` |
| `/teacher/enrollments` | `/teacher/requests?tab=enrollments` |
| `/teacher/demo` | `/teacher/requests?tab=demos` |
| `/teacher/reschedule` | `/teacher/requests?tab=reschedules` |
| `/teacher/hw-tests`, `/teacher/resources`, `/teacher/certificates` | `/teacher/my-classes?tab=…` |
| `/teacher/leave` | `/teacher/calendar?tab=leave` |
| `/teacher/bank-account`, `/teacher/rate-calculator` | `/teacher/earnings?tab=…` |

Class-level pages (`…/classes/[sessionId]/join`, `…/start`, `…/reschedule`) do **not** move.

---

## 7. How to build it (3 small patches)

**Patch A — menus only (safest, do first)**
- Edit `ParentSidebar.tsx` and `TeacherSidebar.tsx` to the new item lists.
- Remove the 3 dead links. Rename labels to the glossary.
- Point each new item at the **existing** page that is its main tab for now.
- Nothing else changes; every old page still works.

**Patch B — hubs with tabs**
- Add a small shared `Tabs` wrapper (read `?tab=` from the URL).
- Build the hub pages, reusing the existing components inside each tab (no rewrites):
  Parent `my-classes`, `calendar`, `courses`, `payments`, `account`;
  Teacher `courses`, `requests`, `my-classes`, `calendar`, `earnings`.
- Add a count badge to Teacher *Requests* (the Admin queue-counts route is a pattern to copy).

**Patch C — redirects and clean-up**
- Turn the old routes in section 6 into `redirect()` pages.
- Update links inside notifications and emails to the new routes (see watch-outs).
- Delete unused old page code only after the redirects are live.

---

## 8. Watch-outs

- **`06` #69** (Parent nav merge): "remove old routes after a few weeks, or keep for notification deep links?" — this plan **keeps them as redirects**, which answers it.
- Notification `link` values point at old routes. Keep the redirects until those links are updated.
- **Go Live / Teacher Live** and **Favorites / Mall / Gift / FAQs** stay deferred — do not add menu items for them.
- No schema, API or auth change in any patch.
- Run `npm run build` before pushing Patch B (it adds client hooks reading the URL).

---

## 9. Decide before Patch A

1. **Teacher Chat:** inside *My Classes* only, or keep a top-level Chat item?
2. **Demo for parents:** inside *My Classes → Demos* (proposed), or keep a separate *Demo* menu item?
3. **Wording:** OK to drop "Enrollment" from the UI and say "My Classes" everywhere?
