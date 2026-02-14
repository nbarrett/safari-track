import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { AuthSessionProvider } from "~/app/_components/session-provider";
import { Nav } from "~/app/_components/nav";
import { SafariPrompt } from "~/app/_components/safari-prompt";
import { SwProvider } from "~/app/_components/sw-provider";
import { SyncIndicator } from "~/app/_components/sync-indicator";

export const metadata: Metadata = {
  title: "Klaserie Camps",
  description: "GPS wildlife tracking for Klaserie Private Nature Reserve",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icon-192.png" },
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Klaserie Camps",
  },
  other: {
    "theme-color": "#6B4C2E",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="flex h-dvh flex-col bg-brand-cream">
        <AuthSessionProvider>
          <TRPCReactProvider>
            <SwProvider>
              <SafariPrompt />
              <Nav />
              {children}
              <SyncIndicator />
            </SwProvider>
          </TRPCReactProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
