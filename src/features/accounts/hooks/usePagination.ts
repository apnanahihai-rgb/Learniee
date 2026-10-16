"use client";

import { useState } from "react";

export const ACCOUNTS_PAGE_SIZE = 10;

/**
 * Client-side paging for the dashboard tables. `resetKey` should change whenever
 * the filters change; the table then returns to page 1 without an effect.
 */
export function usePagination<T>(items: T[], resetKey = "", pageSize = ACCOUNTS_PAGE_SIZE) {
  const [state, setState] = useState({ page: 1, key: resetKey });

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requested = state.key === resetKey ? state.page : 1;
  const page = Math.min(Math.max(1, requested), pageCount);

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    page,
    pageCount,
    pageItems,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + pageItems.length,
    setPage: (next: number) => setState({ page: next, key: resetKey }),
  };
}
