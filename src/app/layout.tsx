import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLOOMBERG TERMINAL",
  description: "Bloomberg Terminal News Feed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col scanline">{children}</body>
    </html>
  );
}
