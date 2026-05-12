"use client";

// Top-level error boundary. Catches any thrown error during server or client
// render that wasn't handled inside a more local error.tsx, and renders the
// actual message instead of Next's generic "Application error" digest page.
//
// Kept intentionally minimal so it'll render even if globals.css fails to load.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        background: "#F6F5EE",
        color: "#0A0A5C",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        margin: 0,
        padding: "4rem 2rem",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#b91c1c",
          }}>
            Server error
          </div>
          <h1 style={{
            fontSize: "1.875rem",
            lineHeight: 1.1,
            letterSpacing: "-0.015em",
            fontWeight: 500,
            marginTop: 12,
          }}>
            Something threw while loading this page.
          </h1>
          <pre style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #dedccf",
            background: "#FFFEF8",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: "#0A0A5C",
            fontFamily: "ui-monospace, monospace",
          }}>
            {error?.message || String(error)}
            {error?.digest ? `\n\nDigest: ${error.digest}` : ""}
            {error?.stack ? `\n\n${error.stack}` : ""}
          </pre>
          <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
            <button
              onClick={reset}
              style={{
                background: "#0A0A5C",
                color: "#F6F5EE",
                padding: "10px 24px",
                fontSize: 14,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a href="/login" style={{ color: "#5a5a7a", textDecoration: "underline" }}>
              Back to login
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
