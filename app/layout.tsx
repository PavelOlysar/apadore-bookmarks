import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apadore Bookmarks",
  description: "A curated inspiration archive for the Apadore team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
