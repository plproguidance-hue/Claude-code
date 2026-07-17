import type { Metadata } from "next";

import { brand } from "@/config/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${brand.brandName} Portal`,
    template: `%s · ${brand.brandName} Portal`,
  },
  description: `${brand.legalName} client & operations portal — ${brand.tagline}`,
  icons: { icon: brand.logo.compact },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
