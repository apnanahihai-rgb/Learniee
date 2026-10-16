"use client";

import RouteError from "@/components/errors/RouteError";

export default function AccountsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      inShell
      homeHref="/accounts"
      homeLabel="Back to dashboard"
    />
  );
}
