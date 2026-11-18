"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

/** Dashboard-design "Something went wrong" card with a Retry button. */
export default function PdErrorState({
  message = "We couldn’t load this page. Check your connection and try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-pd-line bg-white p-5">
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <span className="grid size-14 place-items-center rounded-xl bg-pd-red-bg text-pd-red">
          <TriangleAlert size={26} />
        </span>
        <h3 className="font-heading text-lg font-semibold text-pd-ink">Something went wrong</h3>
        <p className="max-w-[360px] text-sm text-pd-ink3">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-pd-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-pd-brand-d active:scale-[0.98]"
          >
            <RotateCw size={16} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
