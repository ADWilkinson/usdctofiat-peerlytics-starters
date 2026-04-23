import type { Metadata } from "next";
// oxlint-disable-next-line import/no-unassigned-import -- Next.js requires global CSS side-effect imports in layout files.
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Offramp Starter",
  description: "Starter integration for @usdctofiat/offramp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
