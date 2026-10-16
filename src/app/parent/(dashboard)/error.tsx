"use client";

import RouteError from "@/components/errors/RouteError";

export default function ParentError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      inShell
      homeHref="/parent"
      homeLabel="Back to dashboard"
    />
  );
}
