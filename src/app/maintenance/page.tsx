import type { Metadata } from "next";

import ErrorScreen, { errorPrimaryBtn } from "@/components/errors/ErrorScreen";

export const metadata: Metadata = {
  title: "Down for maintenance | Learniee",
  robots: { index: false, follow: false },
};

// Static so it still serves if the database is down.
export default function MaintenancePage() {
  return (
    <ErrorScreen
      code="503"
      title="We'll be right back"
      message="Learniee is down for a short scheduled update. Your classes and data are safe — please check back in a few minutes."
    >
      {/* Plain <a>: a full reload re-checks whether the site is back. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className={errorPrimaryBtn}>
        Check again
      </a>
    </ErrorScreen>
  );
}
