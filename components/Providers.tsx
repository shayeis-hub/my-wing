"use client";

import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "1rem",
            background: "#fff",
            color: "#1e293b",
            boxShadow: "0 4px 24px rgba(14,165,233,0.12)",
            direction: "rtl",
          },
        }}
      />
    </>
  );
}
