"use client";

import Link from "next/link";
import { Check, Circle, ArrowRight } from "lucide-react";

import { useProfile } from "@/features/parent/hooks/useProfile";

interface ProfileCompletionCardProps {
  /** Number of children already added (the dashboard already loads this). */
  studentCount: number;
  studentsLoading: boolean;
}

/**
 * Dashboard checklist for the details we no longer ask for during
 * onboarding. Each item links to the page where it can be filled in, and the
 * whole card disappears once everything is done. Hidden while loading or if
 * the profile can't be loaded, so it never blocks the rest of the dashboard.
 */
export default function ProfileCompletionCard({
  studentCount,
  studentsLoading,
}: ProfileCompletionCardProps) {
  const { profile, loading, error } = useProfile();

  if (loading || studentsLoading || error || !profile) return null;

  const items = [
    {
      key: "child",
      label: "Add your child",
      hint: "Needed to book a demo or enrol",
      href: "/parent/students/new",
      done: studentCount > 0,
    },
    {
      key: "location",
      label: "Add your country",
      hint: "Helps match you with teachers in your timezone",
      href: "/parent/profile",
      done: Boolean(profile.country?.trim()),
    },
    {
      key: "preferences",
      label: "Set your preferences",
      hint: "Language and how we contact you",
      href: "/parent/profile",
      done: Boolean(
        profile.preferredLanguage?.trim() && profile.modeOfCommunication?.trim(),
      ),
    },
  ];

  const doneCount = items.filter((item) => item.done).length;
  if (doneCount === items.length) return null;

  return (
    <section
      aria-label="Complete your profile"
      className="bg-white border border-violet-100 rounded-3xl p-5 sm:p-6 mb-8 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-bold text-gray-900">Complete your profile</h2>
        <span className="text-xs font-semibold text-violet-600">
          {doneCount} of {items.length} done
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-violet-100 mb-4" aria-hidden>
        <div
          className="h-full rounded-full bg-violet-600 transition-all"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            {item.done ? (
              <div className="flex items-center gap-3 px-2 py-2 text-sm text-gray-400">
                <Check className="size-4 text-violet-600 shrink-0" />
                <span className="line-through">{item.label}</span>
              </div>
            ) : (
              <Link
                href={item.href}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-violet-50 transition-colors"
              >
                <Circle className="size-4 text-gray-300 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-800">
                    {item.label}
                  </span>
                  <span className="block text-xs text-gray-500">{item.hint}</span>
                </span>
                <ArrowRight className="size-4 text-violet-600 shrink-0" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
