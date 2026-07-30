import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

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
    <html lang="en">
      <body className="font-[family-name:var(--font-sora)]">
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
