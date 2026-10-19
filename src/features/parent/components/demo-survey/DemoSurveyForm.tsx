"use client";

import { useState } from "react";

import type { DemoSurveyAnswers } from "@/features/parent/hooks/useDemoSurvey";
import {
  DEMO_FITS,
  DEMO_FIT_LABELS,
  DEMO_INTENTS,
  DEMO_INTENT_LABELS,
  DEMO_RATINGS,
  DEMO_RATING_LABELS,
  DEMO_REASONS,
  DEMO_REASON_LABELS,
  surveyNeedsReason,
  type DemoFitValue,
  type DemoIntentValue,
  type DemoRatingValue,
  type DemoReasonValue,
} from "@/features/shared/utils/demoSurvey";

interface Props {
  submitting: boolean;
  error: string;
  onSubmit: (answers: DemoSurveyAnswers) => void;
}

function Chips<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="mb-6">
      <legend className="text-sm font-bold text-gray-800 mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold border transition-colors ${
                active
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand-dark"
              }`}
            >
              {labels[option]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The 3-tap survey: one screen, no typing, one optional reason chip. */
export default function DemoSurveyForm({ submitting, error, onSubmit }: Props) {
  const [overall, setOverall] = useState<DemoRatingValue | null>(null);
  const [levelFit, setLevelFit] = useState<DemoFitValue | null>(null);
  const [intent, setIntent] = useState<DemoIntentValue | null>(null);
  const [reason, setReason] = useState<DemoReasonValue | null>(null);

  const needsReason = surveyNeedsReason(overall, intent);
  const ready = !!overall && !!levelFit && !!intent;

  function handleSubmit() {
    if (!overall || !levelFit || !intent) return;

    onSubmit({ overall, levelFit, intent, reason: needsReason ? reason : null });
  }

  return (
    <div>
      <Chips
        label="How was the demo overall?"
        options={DEMO_RATINGS}
        labels={DEMO_RATING_LABELS}
        value={overall}
        onChange={setOverall}
      />
      <Chips
        label="Did the teacher suit your child's level & style?"
        options={DEMO_FITS}
        labels={DEMO_FIT_LABELS}
        value={levelFit}
        onChange={setLevelFit}
      />
      <Chips
        label="Ready to continue with this teacher?"
        options={DEMO_INTENTS}
        labels={DEMO_INTENT_LABELS}
        value={intent}
        onChange={setIntent}
      />

      {needsReason && (
        <Chips
          label="What went wrong? (optional)"
          options={DEMO_REASONS}
          labels={DEMO_REASON_LABELS}
          value={reason}
          onChange={setReason}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 mb-3">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!ready || submitting}
        onClick={handleSubmit}
        className="w-full sm:w-auto bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-8 py-3 rounded-full transition-colors"
      >
        {submitting ? "Saving…" : "Submit"}
      </button>
    </div>
  );
}
