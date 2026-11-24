"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

import { ADMIN_SEARCH_ENTRIES } from "@/features/admin/config/adminNav";

/** "Jump to a screen…" box in the top bar (shown from tablet width up). */
export default function AdminJumpSearch() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();

    if (!q) return [];

    return ADMIN_SEARCH_ENTRIES.filter((entry) => entry.label.toLowerCase().includes(q)).slice(0, 7);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function onDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function reset() {
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative ml-4 hidden max-w-[400px] flex-1 md:block">
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-[11px] text-pd-ink3"
      />
      <input
        type="search"
        value={query}
        autoComplete="off"
        placeholder="Jump to a screen…"
        aria-label="Jump to a screen"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(event.target.value.trim().length > 0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) {
            router.push(results[0].href);
            reset();
          }
        }}
        className="h-10 w-full rounded-[10px] border border-pd-line bg-pd-bg pl-[42px] pr-4 outline-none transition focus:border-pd-brand focus:bg-white focus:ring-4 focus:ring-pd-b100"
      />

      {open && (
        <div className="absolute left-0 top-[calc(100%+14px)] z-[80] max-h-[70dvh] w-[360px] max-w-[calc(100vw-16px)] overflow-auto rounded-xl border border-pd-line bg-white shadow-[0_16px_40px_-12px_rgba(23,23,43,0.3)]">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-[13px] text-pd-ink3">No matching screen</div>
          ) : (
            results.map((entry) => {
              const Icon = entry.icon;

              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={reset}
                  className="flex w-full items-center gap-3 border-t border-pd-line px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-pd-b50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-pd-b50 text-pd-brand">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[14px] font-semibold">{entry.label}</b>
                    <small className="block text-[13px] text-pd-ink3">{entry.group}</small>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
