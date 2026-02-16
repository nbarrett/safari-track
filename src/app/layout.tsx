import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { AuthSessionProvider } from "~/app/_components/session-provider";
import { ClientNav } from "~/app/_components/client-nav";
import { InstallPrompt } from "~/app/_components/install-prompt";
import { SwProvider } from "~/app/_components/sw-provider";
import { SyncIndicator } from "~/app/_components/sync-indicator";
import { LoaderDismiss } from "~/app/_components/loader-dismiss";
import { OfflineErrorBoundary } from "~/app/_components/error-boundary";

export const metadata: Metadata = {
  title: "Safari Track",
  description: "GPS-tracked game drives and wildlife sighting logs",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png", sizes: "180x180" },
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Safari Track",
    startupImage: [
      { url: "/splash/iphone-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/iphone-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/iphone-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/iphone-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/iphone-1080x2340.png", media: "(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/iphone-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/ipad-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/ipad-1668x2388.png", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/ipad-1640x2360.png", media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/ipad-1488x2266.png", media: "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },
  other: {
    "theme-color": "#6B4C2E",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body suppressHydrationWarning className="flex h-dvh flex-col bg-brand-cream" style={{ backgroundColor: "#EDE4D9" }}>
        <div
          id="app-loader"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#EDE4D9",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#6B4C2E",
              letterSpacing: "0.025em",
            }}
          >
            Safari Track
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              width: "2rem",
              height: "2rem",
              border: "3px solid #D4C5B0",
              borderTopColor: "#6B4C2E",
              borderRadius: "50%",
              animation: "loader-spin 0.8s linear infinite",
            }}
          />
        </div>
        <AuthSessionProvider>
          <TRPCReactProvider>
            <SwProvider>
              <LoaderDismiss />
              <InstallPrompt />
              <ClientNav />
              <OfflineErrorBoundary>
                <div style={{ paddingTop: "env(safe-area-inset-top, 0px)" }} className="flex min-h-0 flex-1 flex-col">
                  {children}
                </div>
              </OfflineErrorBoundary>
              <SyncIndicator />
            </SwProvider>
          </TRPCReactProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
