"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { useNextAction } from "@/features/parent/hooks/useNextAction";

/**
 * Dashboard "next best action" card (Parent journey): one card, decided
 * server-side, so the parent never has to hunt for what to do next.
 *
 * If a finished demo's survey has never been opened, the first dashboard
 * visit sends the parent straight to it once. Opening the survey page
 * stamps it as opened, so this never redirects twice — after that the
 * parent just sees the card.
 */
export default function NextActionCard() {
  const router = useRouter();
  const { action, loading } = useNextAction();
  const redirected = useRef(false);

  useEffect(() => {
    if (action?.autoOpenSurveyId && !redirected.current) {
      redirected.current = true;
      router.push(`/parent/demo-feedback/${action.autoOpenSurveyId}`);
    }
  }, [action, router]);

  if (loading) {
    return <div className="h-28 rounded-3xl bg-violet-50 animate-pulse mb-8" />;
  }

  // A failed load just hides the card; the rest of the dashboard still works.
  if (!action) return null;

  return (
    <section
      aria-label="Your next step"
      className="relative overflow-hidden rounded-3xl bg-white border-2 border-brand/20 p-5 sm:p-6 mb-8 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm"
    >
      <span className="w-11 h-11 rounded-2xl bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
        <Sparkles size={20} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand mb-0.5">
          Your next step
        </p>
        <h2 className="font-heading text-base sm:text-lg font-bold text-gray-800">
          {action.title}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">{action.body}</p>
      </div>

      <Link
        href={action.href}
        className="inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors flex-shrink-0"
      >
        {action.ctaLabel}
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}
