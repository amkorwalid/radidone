import type { Metadata } from "next";
import { ToastProvider } from "./components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radidone - Dental X-ray Training",
  description: "AI-powered dental radiology training platform with interactive annotation and voice-driven Socratic mentoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black font-sans">
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
