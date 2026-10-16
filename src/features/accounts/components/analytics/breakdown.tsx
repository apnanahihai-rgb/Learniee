"use client";

import { useState } from "react";

import PieChart, { type PieChartSlice } from "@/features/accounts/components/PieChart";
import { useAccountsAnalytics } from "@/features/accounts/hooks/useAccountsAnalytics";
import { AdminError, AdminPanel } from "@/features/admin/components/ui/primitives";
import { DEFAULT_SELECTED_METRICS, METRIC_DEFS, METRIC_ORDER, type MetricKey } from "./constants";
import { PeriodSelect, usePeriodRange } from "./period";

/**
 * Build Your Own Breakdown: tick any of the figures on the page and see them
 * side by side as shares of one combined total, in one donut. Ticked figures
 * that are ₹0 for the period are left out of the ring.
 *
 * Holds its own period and its own analytics fetch, deliberately not the
 * page's, so it can be checked against (say) This Month while the rest of the
 * page stays on All Time.
 */
export function CustomBreakdownDonut() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range } = usePeriodRange();
  const { analytics, loading, error } = useAccountsAnalytics(range);

  const [selected, setSelected] = useState<Set<MetricKey>>(() => new Set(DEFAULT_SELECTED_METRICS));

  function toggle(key: MetricKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const slices: PieChartSlice[] = analytics
    ? METRIC_ORDER.filter((key) => selected.has(key))
        .map((key) => {
          const def = METRIC_DEFS[key];
          return { label: def.label, value: def.getValue(analytics), color: def.color };
        })
        .filter((s) => s.value > 0)
    : [];

  return (
    <AdminPanel className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-admin-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-heading text-[19px] font-bold leading-tight text-admin-ink">
            Build Your Own Breakdown
          </h2>
          <p className="mt-0.5 text-[14px] text-admin-muted">
            Tick any figures to see them as slices of one combined total.
          </p>
        </div>
        <PeriodSelect
          id="breakdown-period"
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          customTo={customTo}
          onCustomToChange={setCustomTo}
        />
      </div>

      <div className="px-5 pt-4">
        <AdminError>{error}</AdminError>
      </div>

      <div className="flex flex-wrap items-start gap-6 p-5">
        <fieldset className="grid min-w-[300px] flex-1 gap-x-4 gap-y-0.5 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          <legend className="sr-only">Figures to include</legend>
          {METRIC_ORDER.map((key) => {
            const def = METRIC_DEFS[key];
            const id = `breakdown-${key}`;

            return (
              <div key={key} className="flex min-h-11 items-center gap-2.5">
                <input
                  id={id}
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                  className="size-5 accent-brand"
                />
                <span aria-hidden="true" className="size-3 shrink-0 rounded-[3px]" style={{ backgroundColor: def.color }} />
                <label htmlFor={id} className="cursor-pointer text-[15px] font-semibold text-admin-ink">
                  {def.label}
                </label>
              </div>
            );
          })}
        </fieldset>

        <div className="min-w-[340px] flex-1">
          {loading ? (
            <p role="status" className="py-10 text-center text-admin-muted">
              Loading…
            </p>
          ) : !analytics ? (
            <p className="py-10 text-center text-admin-muted">Unable to load this breakdown.</p>
          ) : slices.length === 0 ? (
            <p className="py-10 text-center text-admin-muted">
              {selected.size === 0
                ? "Tick at least one figure to see the breakdown."
                : "The figures you've selected are all ₹0 for this period."}
            </p>
          ) : (
            <PieChart slices={slices} ariaLabel="Custom breakdown donut" />
          )}
        </div>
      </div>
    </AdminPanel>
  );
}
