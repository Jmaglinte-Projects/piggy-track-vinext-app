import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PiggyTrack — Farm records, simplified",
  description: "Track pig batches, expenses, sales, and payments in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-PH">
      <body>{children}</body>
    </html>
  );
}
