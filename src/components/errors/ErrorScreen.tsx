import type { ReactNode } from "react";

import { COMPANY_INFO } from "@/lib/companyInfo";

/** Shared button styles for error-page actions (works on <a>, <Link> and <button>). */
export const errorPrimaryBtn =
  "inline-flex items-center justify-center rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md transition active:scale-[0.97] hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30";

export const errorSecondaryBtn =
  "inline-flex items-center justify-center rounded-full border-2 border-brand/30 bg-white px-6 py-2.5 text-sm font-bold text-brand transition active:scale-[0.97] hover:border-brand hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30";

interface ErrorScreenProps {
  /** Big label, e.g. "404". */
  code: string;
  title: string;
  message: string;
  /** Action buttons / links. */
  children?: ReactNode;
  /** Small grey line under the actions (e.g. an error reference id). */
  footnote?: string;
  /** Hide the "contact support" line (used where it makes no sense). */
  hideSupport?: boolean;
  /** Fill the whole viewport (root pages) or just the parent area (dashboards). */
  fullScreen?: boolean;
}

/**
 * Presentational error page used by 404 / 500 / 403 / session-expired /
 * maintenance. No hooks and no data access on purpose: an error page must
 * keep rendering even when the database or API is the thing that is down.
 */
export default function ErrorScreen({
  code,
  title,
  message,
  children,
  footnote,
  hideSupport = false,
  fullScreen = true,
}: ErrorScreenProps) {
  return (
    <main
      role="alert"
      className={`flex w-full flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-amber-50 px-6 py-12 text-center ${
        fullScreen ? "min-h-dvh" : "min-h-[70vh] rounded-3xl"
      }`}
    >
      <p
        aria-hidden="true"
        className="font-heading text-[7rem] font-extrabold leading-none text-brand drop-shadow-sm sm:text-[9rem]"
      >
        {code}
      </p>
      <h1 className="mt-2 font-heading text-2xl font-bold text-gray-900 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-base text-gray-600">{message}</p>

      {children ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      ) : null}

      {footnote ? <p className="mt-6 text-xs text-gray-400">{footnote}</p> : null}

      {hideSupport ? null : (
        <p className="mt-8 text-sm text-gray-500">
          Need help?{" "}
          <a
            className="font-semibold text-brand underline-offset-4 hover:underline"
            href={`mailto:${COMPANY_INFO.email}`}
          >
            {COMPANY_INFO.email}
          </a>
        </p>
      )}
    </main>
  );
}
