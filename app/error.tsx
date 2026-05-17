"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("App Error:", error.message, error.stack);
  return (
    <div style={{ padding: 24, fontFamily: "monospace" }}>
      <h2>שגיאה: {error.message}</h2>
      <pre style={{ fontSize: 12, color: "red" }}>{error.stack}</pre>
      <button onClick={reset}>נסה שוב</button>
    </div>
  );
}
