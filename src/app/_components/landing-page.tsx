"use client";

import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    title: "GPS Game Drives",
    description: "Track your game drives with live GPS mapping and route recording.",
  },
  {
    title: "Wildlife Sightings",
    description: "Log sightings with photos, GPS coordinates, and species details.",
  },
  {
    title: "Species Checklist",
    description: "Build your personal checklist of species spotted in the reserve.",
  },
];

export function LandingPage() {
  return (
    <main
      className="relative min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/hero-elephants.jpg')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-6 py-12">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-icon.png"
            alt="Safari Track"
            width={360}
            height={240}
            className="mb-4 w-64 shadow-lg drop-shadow-xl"
          />
          <h1 className="text-4xl font-light tracking-wide text-white">
            Safari Track
          </h1>
          <p className="mt-2 text-sm tracking-widest uppercase text-white/70">
            Wildlife Tracking
          </p>
        </div>

        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-white">
              Track. Discover. Conserve.
            </h2>
            <p className="text-sm leading-relaxed text-white/70">
              GPS-tracked game drives, wildlife sighting logs, and a personal
              species checklist for safari guides and guests.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg bg-white/10 p-4 text-left backdrop-blur-sm"
              >
                <div className="mb-1 text-lg font-medium text-white">
                  {feature.title}
                </div>
                <p className="text-xs leading-relaxed text-white/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full rounded-lg bg-white px-6 py-3 text-center font-medium text-brand-dark shadow-lg transition hover:bg-white/90"
            >
              Sign In
            </Link>
            <Link
              href="/lodges"
              className="block w-full rounded-lg border border-white/30 px-6 py-3 text-center font-medium text-white transition hover:bg-white/10"
            >
              Explore Our Camps
            </Link>
            <Link
              href="/checklist"
              className="block w-full rounded-lg border border-white/30 px-6 py-3 text-center font-medium text-white transition hover:bg-white/10"
            >
              Species Checklist
            </Link>
          </div>
        </div>

        <p className="text-xs text-white/40">
          Greater Kruger National Park &middot; South Africa
        </p>
      </div>
    </main>
  );
}
