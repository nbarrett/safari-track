import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { AuthSessionProvider } from "~/app/_components/session-provider";
import { Nav } from "~/app/_components/nav";

export const metadata: Metadata = {
  title: "Klaserie Camps",
  description: "GPS wildlife tracking for Klaserie Private Nature Reserve",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
            <Nav />
            {children}
          </TRPCReactProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
