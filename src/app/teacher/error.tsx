"use client";

import RouteError from "@/components/errors/RouteError";

export default function TeacherError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      inShell
      homeHref="/teacher"
      homeLabel="Back to dashboard"
    />
  );
}
