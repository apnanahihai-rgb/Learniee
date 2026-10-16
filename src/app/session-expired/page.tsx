import type { Metadata } from "next";
import Link from "next/link";

import ErrorScreen, {
  errorPrimaryBtn,
  errorSecondaryBtn,
} from "@/components/errors/ErrorScreen";

export const metadata: Metadata = {
  title: "Session expired | Learniee",
  robots: { index: false, follow: false },
};

export default function SessionExpiredPage() {
  return (
    <ErrorScreen
      code="401"
      title="Your session has expired"
      message="For your security we signed you out. Please log in again to continue."
      hideSupport
    >
      <Link href="/login" className={errorPrimaryBtn}>
        Log in again
      </Link>
      <Link href="/" className={errorSecondaryBtn}>
        Go to homepage
      </Link>
    </ErrorScreen>
  );
}
