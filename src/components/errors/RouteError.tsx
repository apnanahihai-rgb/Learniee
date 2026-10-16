"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

import ErrorScreen, {
  errorPrimaryBtn,
  errorSecondaryBtn,
} from "./ErrorScreen";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Where "Go back" should send the user (e.g. "/parent"). Defaults to the site root. */
  homeHref?: string;
  homeLabel?: string;
  /** True inside a dashboard layout (renders inside the shell, not full screen). */
  inShell?: boolean;
}

/**
 * Body of every `error.tsx` (500 / "something went wrong"). Shown when a page
 * throws while rendering. "Try again" refetches server data and re-renders.
 */
export default function RouteError({
  error,
  reset,
  homeHref = "/",
  homeLabel = "Go to homepage",
  inShell = false,
}: RouteErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Server errors arrive with the message stripped; `digest` matches the server log.
    console.error("Route error:", error);
  }, [error]);

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <ErrorScreen
      code="500"
      title="Something went wrong"
      message="We hit an unexpected problem loading this page. It's not you — please try again in a moment."
      footnote={error.digest ? `Error reference: ${error.digest}` : undefined}
      fullScreen={!inShell}
    >
      <button type="button" onClick={retry} className={errorPrimaryBtn}>
        Try again
      </button>
      <Link href={homeHref} className={errorSecondaryBtn}>
        {homeLabel}
      </Link>
    </ErrorScreen>
  );
}
