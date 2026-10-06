import type { Metadata } from "next";
import { Inter, Noto_Sans } from "next/font/google";
import "./globals.css";

// ── Primary font: Inter ────────────────────────────────────────────────────
// Inter is a variable font — no weight array needed; all weights are included.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// ── Secondary font: Noto Sans ──────────────────────────────────────────────
// Noto Sans is used for multilingual content, official documents, and language
// fallback where broader character coverage is required.
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${notoSans.variable}`}>
      <head>
        <link rel="icon" href="/fav.jpeg" type="image/jpeg" />
        <link rel="shortcut icon" href="/fav.jpeg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/fav.jpeg" />
      </head>
      <body className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased">
        {children}
      </body>
    </html>
  );
}
