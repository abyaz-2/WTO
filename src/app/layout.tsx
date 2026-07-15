import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WTO | Digital Dispute Documentation Platform",
  description:
    "The World Trade Organization Digital Dispute Documentation Platform — streamline dispute documentation for DSB simulations.",
  icons: [{ rel: "icon", url: "/logo.png" }],
  openGraph: {
    title: "WTO | Digital Dispute Documentation Platform",
    description:
      "Streamline dispute documentation for WTO DSB simulations.",
    siteName: "WTO",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

import ErrorBoundary from "@/components/ErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="font-[family-name:var(--font-sora)]">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
