"use client";

import Image from "next/image";

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/hero-rhinos.webp"
          alt="Safari wildlife"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-brand-dark/70" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="space-y-4 rounded-lg bg-white/95 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-2 flex flex-col items-center">
            <Image
              src="/logo-icon.png"
              alt="Safari Track"
              width={768}
              height={512}
              className="mb-4 w-56"
              priority
            />
            <h1 className="text-2xl font-semibold tracking-wide text-brand-dark">Safari Track</h1>
            <p className="text-sm text-brand-khaki">Wildlife Tracking</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
