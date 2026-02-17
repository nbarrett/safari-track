"use client";

import Image from "next/image";
import Link from "next/link";
import { LODGE_DATA } from "~/app/lodges/lodge-data";
import { PageBackdrop } from "~/app/_components/page-backdrop";

export default function LodgesPage() {
  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 sm:px-8">
        <div className="mb-2">
          <Link
            href="/"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-brand-gold">
            Greater Kruger, South Africa
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white drop-shadow sm:text-4xl">
            Our Lodges
          </h1>
          <p className="mt-3 text-lg text-white/80 drop-shadow">
            Three exclusive safari lodges in the heart of the Greater Kruger
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {LODGE_DATA.map((lodge) => (
            <Link
              key={lodge.slug}
              href={`/lodges/${lodge.slug}`}
              className="group block overflow-hidden rounded-2xl bg-white/95 shadow-lg backdrop-blur-sm transition hover:shadow-xl"
            >
              <div className="sm:flex">
                <div className="relative h-56 sm:h-auto sm:w-80 sm:shrink-0">
                  <Image
                    src={lodge.heroImages[0]!}
                    alt={lodge.name}
                    fill
                    className="object-cover transition group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  <Image
                    src={lodge.brand.logoUrl}
                    alt={lodge.brand.name}
                    width={160}
                    height={64}
                    unoptimized
                    className="mb-3 h-10 w-auto object-contain object-left"
                    style={lodge.brand.logoLight ? { filter: "brightness(0)" } : undefined}
                  />
                  <h2 className="text-2xl font-bold text-brand-dark group-hover:text-brand-brown">
                    {lodge.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium" style={{ color: lodge.brand.accentColour }}>
                    {lodge.tagline}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-brand-dark/70">
                    {lodge.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lodge.highlights.slice(0, 3).map((h) => (
                      <span
                        key={h}
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: `${lodge.brand.accentColour}15`, color: lodge.brand.accentColour }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
