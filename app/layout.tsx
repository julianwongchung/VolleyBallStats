import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/app-provider";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "VolleyStats",
  title: "VolleyStats",
  description: "Mobile-first volleyball match and player statistics recorder.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VolleyStats"
  },
  icons: {
    icon: [
      { url: "/brand/volleystats-logo.png", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/brand/volleystats-logo.png", type: "image/png" }]
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#087f7b"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AppProvider>{children}</AppProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
