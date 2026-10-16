"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: replaces the root layout when the layout itself
 * crashes. Layout, fonts and Tailwind are not available here, so it uses
 * inline styles only and plain <a>/<button> elements.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "linear-gradient(135deg,#f5f0ff,#ffffff 50%,#fff8e6)",
          color: "#111827",
        }}
      >
        <p style={{ margin: 0, fontSize: "6rem", fontWeight: 800, color: "#7e2bf1" }}>500</p>
        <h1 style={{ margin: "8px 0 0", fontSize: "1.75rem" }}>Learniee is having trouble</h1>
        <p style={{ margin: "12px 0 0", maxWidth: 420, color: "#4b5563" }}>
          Something went wrong on our side. Please reload the page — if it keeps happening, try again in a few minutes.
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#7e2bf1",
              color: "#fff",
              border: 0,
              borderRadius: 999,
              padding: "10px 24px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {/* A plain <a> on purpose: a full reload recovers from a broken layout. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              border: "2px solid #c9a8f8",
              color: "#7e2bf1",
              borderRadius: 999,
              padding: "8px 24px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Go to homepage
          </a>
        </div>
        {error.digest ? (
          <p style={{ marginTop: 24, fontSize: 12, color: "#9ca3af" }}>Error reference: {error.digest}</p>
        ) : null}
      </body>
    </html>
  );
}
