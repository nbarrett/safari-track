"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import { HomeContent } from "~/app/_components/home-content";
import { LandingPage } from "~/app/_components/landing-page";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-brand-cream">
        <Image
          src="/logo-icon.png"
          alt="Safari Track"
          width={120}
          height={120}
          className="mb-6 rounded-2xl"
          priority
        />
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-khaki/30 border-t-brand-brown" />
      </main>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return <HomeContent userName={session.user.name ?? "Guide"} />;
}
