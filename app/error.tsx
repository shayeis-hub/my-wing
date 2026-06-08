"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error.name === "ChunkLoadError" ||
    error.message?.includes("Loading chunk") ||
    error.message?.includes("Failed to fetch dynamically imported module");

  useEffect(() => {
    if (isChunkError) {
      // New deploy detected — clear SW cache and reload
      if ("caches" in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
      window.location.reload();
    }
  }, [isChunkError]);

  if (isChunkError) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#fbf4e6", fontFamily: "system-ui, sans-serif", gap: 12,
      }}>
        <div style={{ width: 32, height: 32, border: "3px solid #f5dd4b", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#8a7e6a", fontSize: 14 }}>מעדכן לגרסה החדשה...</p>
      </div>
    );
  }

  console.error("App Error:", error.message, error.stack);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ color: "#1a1a1a" }}>משהו השתבש</h2>
      <p style={{ color: "#8a7e6a", fontSize: 13 }}>{error.message}</p>
      <button
        onClick={reset}
        style={{
          marginTop: 16, padding: "10px 24px", borderRadius: 12,
          background: "#f5dd4b", border: "none", fontWeight: 700, cursor: "pointer",
        }}
      >
        נסה שוב
      </button>
    </div>
  );
}
