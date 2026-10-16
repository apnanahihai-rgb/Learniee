"use client";

import RouteError from "@/components/errors/RouteError";

export default function HrError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      inShell
      homeHref="/hr"
      homeLabel="Back to dashboard"
    />
  );
}
