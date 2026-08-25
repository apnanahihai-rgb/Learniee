# Project structure

> **Update (modularization pass):** page components and API routes that had
> grown into single large files (the Step 2 onboarding page, the admin
> teacher-review page, and the Step 1/Step 2 onboarding API routes) have been
> split up. See "Splitting large files" below for the pattern to follow next
> time a file starts growing past ~150-200 lines.

This project follows a **feature-based (modular) structure** on top of the
Next.js App Router. The rule of thumb: `src/app` only contains routing —
everything else lives in a feature module under `src/features`.

```
src/
├── app/                        # ROUTES ONLY (Next.js App Router requirement)
│   ├── admin/                  #   admin dashboard + teacher approval pages
│   ├── api/                    #   route handlers, grouped by domain
│   ├── login/, signup/, forgot-password/
│   ├── parent/onboarding/...
│   ├── teacher/onboarding/...
│   ├── layout.tsx, page.tsx, globals.css
│   └── ...
│
├── features/                   # ALL feature/business logic lives here
│   ├── auth/                   #   login, signup, forgot-password
│   │   ├── components/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── forgot-password/
│   │   ├── hooks/               useLogin, useSignup, useForgotPassword
│   │   └── types/                signup.ts
│   │
│   ├── teacher/                #   teacher-facing UI
│   │   └── components/
│   │       ├── layout/          TeacherNavbar, TeacherSidebar
│   │       └── onboarding/step1/
│   │
│   ├── admin/                  #   reserved — see components/README.md
│   ├── parent/                 #   reserved — see components/README.md
│   └── shared/                 #   things used by 2+ features
│       └── components/          CountrySelect
│
├── components/
│   └── ui/                     # shadcn/ui primitives ONLY (button, input, checkbox)
│                                # kept here on purpose — components.json's
│                                # "ui" alias points at @/components/ui, so
│                                # `npx shadcn add ...` keeps working
│
├── lib/                        # framework-agnostic utilities (prisma client,
│                                # cognito client, cn()/utils)
├── middleware.ts
└── (no more top-level src/hooks or src/types — see below)
```

## Where things go from now on

| Kind of file | Location |
|---|---|
| A page's route file | `src/app/<route>/page.tsx` — keep it thin: fetch data, compose feature components |
| An API route handler | `src/app/api/<domain>/.../route.ts` (unchanged) |
| A component used by one feature | `src/features/<feature>/components/...` |
| A component used by 2+ features | `src/features/shared/components/...` |
| A generic design-system primitive (button, input) | `src/components/ui/...` (shadcn-managed) |
| A hook used by one feature | `src/features/<feature>/hooks/...` |
| A type used by one feature | `src/features/<feature>/types/...` |
| Cross-cutting utility (db client, cn helper, 3rd-party SDK wrapper) | `src/lib/...` |

## What changed in this pass

- Moved `src/components/{login,signup,forgot-password}` →
  `src/features/auth/components/...`
- Moved `src/hooks/{useLogin,useSignup,useForgotPassword}.ts` →
  `src/features/auth/hooks/...`
- Moved `src/types/signup.ts` → `src/features/auth/types/signup.ts`
- Moved `src/components/teacher/...` → `src/features/teacher/components/...`
- Moved `src/components/common/CountrySelect.tsx` →
  `src/features/shared/components/CountrySelect.tsx`
- Left `src/components/ui`, `src/lib`, `src/app`, `prisma/`, `src/middleware.ts`
  where they were — they're already in the right place
- Updated every `@/...` import to match (verified with `tsc --noEmit`;
  zero path-resolution errors remain — the only two remaining `tsc` errors
  are unrelated `@prisma/client` type errors caused by `prisma generate`
  needing network access, not by this reorganization)
- Added `README.md` placeholders in `features/admin` and `features/parent`
  since those pages currently hold everything inline in the route file

## Two things worth cleaning up next (not done automatically, since they
touch actual logic rather than just file location)

1. **Monolithic page files.** A few route files hold all their UI/logic
   inline instead of importing from a feature module:
   - `src/app/admin/teachers/page.tsx` (~18KB)
   - `src/app/teacher/onboarding/step2/page.tsx` (~20KB)
   - `src/app/parent/onboarding/step{1,2,3}/page.tsx`

   Next time you edit one of these, pull the JSX/handlers out into
   `src/features/<feature>/components/...` and leave the page file as a
   thin shell. I didn't do this automatically because it means touching
   business logic, not just moving files — safer to do with tests/review.

2. **Empty file:** `src/features/teacher/components/onboarding/step1/TeacherPersonalInfo.tsx`
   is 0 bytes (was already empty before this reorg). Either fill it in or
   delete it — an empty component file with no exports will break if
   anything ever tries to import it.

## Not touched

`.agents/`, `.claude/`, and `.windsurf/` all contain identical copies of
the same `skills/` content — that looks intentional (per-tool config for
different AI coding assistants), so it was left alone. If it's not
intentional, you only need to keep one and can delete the other two.

## Splitting large files

When a page or route file grows past ~150-200 lines, split it along these
lines instead of letting it keep growing:

### Client pages (`"use client"` components)

1. **State + data-fetching → a hook.** Move `useState`/`useEffect`, the
   fetch calls, and the submit handler into
   `features/<feature>/hooks/use<Thing>.ts`. The hook returns the values and
   handlers the page needs (`{ formData, loading, error, handleChange, ... }`).
2. **Shared/derived types → a types file.** e.g.
   `features/<feature>/types/<thing>.ts` holds the `FormData` interface, its
   default/initial value, and any shared handler type aliases.
3. **JSX sections → components.** Group related form fields/JSX blocks into
   `features/<feature>/components/.../<Section>.tsx`, each taking the slice
   of state + change handler it needs as props.
4. **The page itself** just calls the hook and composes the section
   components — it should read like a table of contents, not the
   implementation.

Example: `app/teacher/onboarding/step2/page.tsx` (849 → 86 lines) uses
`features/teacher/hooks/useTeacherStep2Form.ts` plus five section components
under `features/teacher/components/onboarding/step2/`.

### API routes

1. **Auth/token parsing → `lib/api-auth.ts`.** Use `requireCognitoAuth(req)`
   or `requireAdminAuth(req)` instead of re-decoding the JWT in every route.
   Both return either `{ error }` (a ready-to-return `NextResponse`) or
   `{ token, payload }`.
2. **Prisma queries/business logic → a service.** Put the actual
   create/update/query logic in `features/<feature>/server/<thing>.service.ts`
   as plain exported functions. Keep create/update field-mapping in ONE
   shared function so the two code paths can't drift apart.
3. **The route handler** just does: auth check → parse input → call the
   service → shape the response. A GET/POST handler should rarely need to
   exceed ~40 lines.

Example: `app/api/teacher/onboarding/step2/route.ts` (422 → ~90 lines) now
delegates to `features/teacher/server/step2.service.ts`.

### Still flagged for a future pass (not touched in this round)

- `app/teacher/onboarding/step3/page.tsx` (161 lines) — smaller, but could
  follow the same hook+sections pattern if it grows further.
- `features/teacher/components/layout/TeacherSidebar.tsx` (225 lines) and
  `TeacherNavbar.tsx` (165 lines) — mostly static nav markup; consider
  extracting nav-item arrays/config if you add more links.
- `TeacherPersonalInfo.tsx` under `onboarding/step1` is still a 0-byte empty
  file from the earlier reorg — delete it or fill it in.
