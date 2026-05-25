"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: "#18181b",
          color: "#fff",
          borderRadius: "0.5rem",
          border: "1px solid #3f3f46",
        },
        success: {
          style: {
            background: "#059669",
            color: "#fff",
          },
          iconTheme: {
            primary: "#fff",
            secondary: "#059669",
          },
        },
        error: {
          style: {
            background: "#dc2626",
            color: "#fff",
          },
          iconTheme: {
            primary: "#fff",
            secondary: "#dc2626",
          },
        },
      }}
    />
  );
}
