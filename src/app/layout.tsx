import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { AuthSessionProvider } from "~/app/_components/session-provider";
import { Nav } from "~/app/_components/nav";
import { SafariPrompt } from "~/app/_components/safari-prompt";
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
              <SafariPrompt />
              <Nav />
              <OfflineErrorBoundary>
                {children}
              </OfflineErrorBoundary>
              <SyncIndicator />
            </SwProvider>
          </TRPCReactProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
