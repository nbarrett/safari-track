"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getLodgeBySlug, LODGE_DATA } from "~/app/lodges/lodge-data";

export default function LodgeShowcasePage() {
  const params = useParams<{ slug: string }>();
  const lodge = getLodgeBySlug(params.slug);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!lodge || lodge.heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % lodge.heroImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [lodge]);

  if (!lodge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-cream">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-dark">Lodge not found</h1>
          <Link href="/" className="mt-4 inline-block text-brand-brown underline">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const otherLodges = LODGE_DATA.filter((l) => l.slug !== lodge.slug);

  return (
    <main className="relative min-h-screen bg-brand-cream">
      <div className="relative h-[70vh] overflow-hidden">
        {lodge.heroImages.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0"
            style={{
              opacity: i === activeImage ? 1 : 0,
              transition: "opacity 2s ease-in-out",
            }}
          >
            <Image
              src={src}
              alt={lodge.name}
              fill
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12">
          <p className="text-sm font-medium uppercase tracking-widest text-brand-gold">
            {lodge.location}
          </p>
          <h1 className="mt-2 text-4xl font-bold text-white sm:text-5xl">
            {lodge.name}
          </h1>
          <p className="mt-2 text-xl text-white/80">
            {lodge.tagline}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-lg leading-relaxed text-brand-dark/80">
              {lodge.description}
            </p>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-brown">
                Highlights
              </h2>
              <ul className="mt-4 space-y-3">
                {lodge.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-brand-dark/80">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-brown">
                At a glance
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-brand-khaki">Capacity</dt>
                  <dd className="font-medium text-brand-dark">{lodge.capacity}</dd>
                </div>
                <div>
                  <dt className="text-brand-khaki">Location</dt>
                  <dd className="font-medium text-brand-dark">{lodge.location}</dd>
                </div>
                <div>
                  <dt className="text-brand-khaki">Region</dt>
                  <dd className="font-medium text-brand-dark">Greater Kruger, South Africa</dd>
                </div>
              </dl>
            </div>

            <Link
              href="/drive"
              className="block rounded-xl bg-brand-brown px-6 py-4 text-center font-semibold text-white shadow-sm transition hover:bg-brand-brown/90"
            >
              Start a Game Drive
            </Link>
          </div>
        </div>

        <div className="mt-16 border-t border-brand-khaki/20 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-brown">
            Explore our other camps
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {otherLodges.map((other) => (
              <Link
                key={other.slug}
                href={`/lodges/${other.slug}`}
                className="group relative overflow-hidden rounded-xl"
              >
                <Image
                  src={other.heroImages[0]!}
                  alt={other.name}
                  width={600}
                  height={300}
                  className="h-48 w-full object-cover transition group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="text-lg font-bold text-white">{other.name}</h3>
                  <p className="text-sm text-white/70">{other.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
