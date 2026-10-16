"use client";

import RouteError from "@/components/errors/RouteError";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      inShell
      homeHref="/admin"
      homeLabel="Back to dashboard"
    />
  );
}
