"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "rgba(30, 41, 59, 0.85)",
          color: "white",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          backdropFilter: "blur(8px)",
          fontWeight: "500",
          fontSize: "0.95rem",
          fontFamily: "var(--font-rubik), sans-serif",
        },
      }}
    />
  );
}
