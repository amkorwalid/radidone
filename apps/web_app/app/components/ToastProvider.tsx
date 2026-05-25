"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      richColors
      toastOptions={{
        duration: 4000,
        style: {
          background: "#18181b",
          color: "#fff",
          borderRadius: "0.5rem",
          border: "1px solid #3f3f46",
        },
      }}
    />
  );
}
