/**
 * Class-string helpers for the redesigned Admin screens (HTML design,
 * Nov 2026). Colours come from the `pd-*` tokens in globals.css, which
 * hold the same palette as the design files. Plain strings (no hooks),
 * so server and client components can both use them.
 */

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Keyboard focus ring used across the Admin chrome. */
export const ADMIN_FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pd-brand";

export type AdminBtnVariant = "pri" | "sec" | "out" | "dtx" | "dng" | "go" | "alt";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const BTN_COLOR: Record<AdminBtnVariant, string> = {
  pri: "bg-pd-brand text-white hover:bg-pd-brand-d",
  sec: "bg-pd-b50 text-pd-brand-d hover:bg-pd-b100",
  out: "border border-pd-line2 bg-white hover:border-pd-brand hover:text-pd-brand",
  dtx: "border border-[#efcdca] bg-white text-pd-red hover:bg-pd-red-bg",
  dng: "bg-pd-red text-white hover:bg-[#a51f19]",
  go: "bg-pd-gold font-bold text-pd-on-gold hover:bg-pd-gold-d",
  alt: "bg-white/14 text-white hover:bg-white/24",
};

/** One complete button class string (height and padding included, so classes never clash). */
export function adminBtn(variant: AdminBtnVariant = "pri", size: "md" | "sm" = "md") {
  const box =
    size === "sm"
      ? "h-[34px] px-3 text-[13px]"
      : variant === "go"
        ? "h-12 px-4"
        : "h-[42px] px-4";

  return cx(BTN_BASE, box, BTN_COLOR[variant], ADMIN_FOCUS);
}

export type AdminTagColor = "amber" | "green" | "violet" | "red" | "gray";

const TAG_COLOR: Record<AdminTagColor, string> = {
  amber: "bg-pd-amber-bg text-pd-amber",
  green: "bg-pd-green-bg text-pd-green",
  violet: "bg-pd-b100 text-pd-brand-d",
  red: "bg-pd-red-bg text-pd-red",
  gray: "border border-pd-line bg-pd-bg text-pd-ink2",
};

export function adminTag(color: AdminTagColor) {
  return cx(
    "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
    TAG_COLOR[color],
  );
}

/** White card with the 16px radius from the design; `flush` = no padding. */
export const ADMIN_CARD = "rounded-2xl border border-pd-line bg-white";
export const ADMIN_CARD_FLUSH = `${ADMIN_CARD} overflow-hidden`;

/** Section title ("Needs your review first") */
export const ADMIN_SECTION_H2 =
  "mb-3 flex items-baseline justify-between gap-3 font-heading text-[19px] font-semibold leading-tight text-balance";
