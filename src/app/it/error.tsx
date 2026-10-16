"use client";

import RouteError from "@/components/errors/RouteError";

export default function ItError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      inShell
      homeHref="/it"
      homeLabel="Back to dashboard"
    />
  );
}
