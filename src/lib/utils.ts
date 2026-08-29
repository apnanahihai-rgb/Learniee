import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a form field expected to hold an age (currently a plain
 * text input everywhere it's collected - see `03-DATA-MODEL.md`'s
 * known-gap note on `Student.age`) into a clean `number | null`
 * for Prisma's `Int?` column.
 *
 * Two failure modes this guards against:
 * - `parseInt("abc")` returns `NaN`, not `null` - Prisma rejects
 *   `NaN` for an `Int?` field with an unhelpful 500 rather than
 *   silently accepting it.
 * - `parseInt(raw, 10) || null` (the pattern this replaces) turns a
 *   real age of 0 into `null`, because `0` is falsy in JS.
 *
 * Shared by every place that writes `Student.age`: onboarding Step
 * 2 (`src/app/api/onboarding/child-info/route.ts`) and "add another
 * child" (`src/features/parent/server/student.service.ts`), so the
 * parsing logic can't drift between the two.
 */
export function parseAge(rawAge: unknown): number | null {
  if (typeof rawAge !== "string" || rawAge.trim() === "") {
    return null;
  }

  const parsed = parseInt(rawAge, 10);

  return Number.isNaN(parsed) ? null : parsed;
}
