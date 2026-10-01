import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EyeX — Smart Classroom Monitor",
  description:
    "Real-time student suspicion monitoring dashboard powered by computer vision.",
  icons: {
    icon: [
      { url: "/fav.jpeg" },
      { url: "/fav.jpeg", type: "image/jpeg" },
    ],
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
      </head>
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
