import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WTO | World Trade Organization",
  description: "The World Trade Organization — a new platform for global trade is coming.",
  icons: [{ rel: "icon", url: "/logo.png" }],
  openGraph: {
    title: "WTO | World Trade Organization",
    description: "A new platform for global trade is coming.",
    siteName: "WTO",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="font-[family-name:var(--font-sora)]">{children}</body>
    </html>
  );
}
