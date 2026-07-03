import type { Metadata, Viewport } from "next";
// oxlint-disable-next-line import/no-unassigned-import -- Next.js requires global CSS side-effect imports in layout files.
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "USDCtoFiat Base Mini App",
  description: "Cash out Base USDC into payment-app money through USDCtoFiat.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
