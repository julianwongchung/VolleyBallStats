import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VolleyStats",
  description: "Mobile-first volleyball match and player statistics recorder."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
