"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { formatTime12, minutesToTime } from "@/features/shared/utils/availability";

interface Props {
  /** "HH:mm" or "" */
  value: string;
  onChange: (value: string) => void;
  /** Smallest / largest selectable time, "HH:mm" (inclusive). */
  min?: string;
  max?: string;
  /** Minutes between options (default 30). */
  step?: number;
  /** Also offer 11:59 PM (for "until midnight" end times). */
  includeEndOfDay?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

const MENU_MAX_HEIGHT = 260;

/**
 * A desktop-friendly time picker: a button that opens a scrollable list of
 * 12-hour times (arrow keys, Enter, Escape), instead of the browser's
 * spinner-style `<input type="time">`. The list is positioned with `fixed`
 * so it is never clipped by a scrolling popup.
 */
export default function TimeSelect({
  value,
  onChange,
  min = "00:00",
  max = "23:30",
  step = 30,
  includeEndOfDay = false,
  placeholder = "Select time",
  ariaLabel,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const options = useMemo(() => {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const list: string[] = [];
    for (let m = toMin(min); m <= toMin(max); m += step) list.push(minutesToTime(m));
    if (includeEndOfDay && !list.includes("23:59")) list.push("23:59");
    // Keep a saved value that isn't on the grid (e.g. 16:15) selectable.
    if (value && !list.includes(value)) list.push(value);
    return list.sort();
  }, [min, max, step, includeEndOfDay, value]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const top =
      below >= MENU_MAX_HEIGHT || below >= rect.top
        ? rect.bottom + 4
        : rect.top - Math.min(MENU_MAX_HEIGHT, rect.top - 8) - 4;
    setPos({ top, left: rect.left, width: Math.max(rect.width, 130) });
    setActive(Math.max(0, options.indexOf(value)));
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;

    function close(e: Event) {
      if (e.type === "mousedown") {
        const target = e.target as Node;
        if (buttonRef.current?.contains(target) || listRef.current?.contains(target)) return;
      }
      if (e.type === "scroll" && listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function pick(time: string) {
    onChange(time);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex items-center justify-between gap-2 min-w-[7.5rem] text-sm border border-violet-100 rounded-lg px-3 py-1.5 bg-white hover:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30 ${className}`}
      >
        <span className={value ? "text-gray-700 font-medium" : "text-gray-400"}>
          {value ? formatTime12(value) : placeholder}
        </span>
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && pos && (
        <ul
          ref={listRef}
          role="listbox"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: MENU_MAX_HEIGHT }}
          className="z-[100] overflow-y-auto rounded-xl border border-violet-100 bg-white py-1 shadow-lg"
        >
          {options.map((t, i) => (
            <li
              key={t}
              role="option"
              aria-selected={t === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(t)}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer ${
                i === active ? "bg-violet-50 text-brand-dark" : "text-gray-700"
              } ${t === value ? "font-bold" : ""}`}
            >
              {formatTime12(t)}
              {t === value && <Check size={13} className="text-brand" />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
