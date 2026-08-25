# Project structure

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
