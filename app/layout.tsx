import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payal Collection | Ladies' Clothing",
  description: "Browse the latest ladies' clothing at Payal Collection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
