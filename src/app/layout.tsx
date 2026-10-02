import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EyeX — Exam Monitoring Platform",
  description:
    "Institutional-grade real-time examination monitoring and malpractice detection platform for Anglophone Cameroon secondary schools.",
  icons: {
    icon: "/fav.jpeg",
    shortcut: "/fav.jpeg",
    apple: "/fav.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/fav.jpeg" type="image/jpeg" />
        <link rel="shortcut icon" href="/fav.jpeg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/fav.jpeg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased">
        {children}
      </body>
    </html>
  );
}
