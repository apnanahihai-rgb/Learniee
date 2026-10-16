import type { Metadata } from "next";
import Link from "next/link";

import ErrorScreen, {
  errorPrimaryBtn,
  errorSecondaryBtn,
} from "@/components/errors/ErrorScreen";

export const metadata: Metadata = {
  title: "Page not found | Learniee",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Page not found"
      message="The page you're looking for doesn't exist, was moved, or the link is broken."
    >
      <Link href="/" className={errorPrimaryBtn}>
        Go to homepage
      </Link>
      <Link href="/login" className={errorSecondaryBtn}>
        Log in
      </Link>
    </ErrorScreen>
  );
}
