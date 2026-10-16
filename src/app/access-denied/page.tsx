import type { Metadata } from "next";
import Link from "next/link";

import ErrorScreen, {
  errorPrimaryBtn,
  errorSecondaryBtn,
} from "@/components/errors/ErrorScreen";

export const metadata: Metadata = {
  title: "Access denied | Learniee",
  robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
  return (
    <ErrorScreen
      code="403"
      title="Access denied"
      message="You don't have permission to view this page. If you think this is a mistake, log in with the right account."
    >
      <Link href="/login" className={errorPrimaryBtn}>
        Log in
      </Link>
      <Link href="/" className={errorSecondaryBtn}>
        Go to homepage
      </Link>
    </ErrorScreen>
  );
}
