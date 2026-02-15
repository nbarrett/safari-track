"use client";

import { useEffect, useState } from "react";

const DEFAULT_IMAGES = [
  "/hero-elephants.jpg",
  "/hero-rhinos.webp",
  "/hero-river-sunrise.avif",
  "/hero-riverbed.avif",
  "/hero-wildlife-01.jpg",
  "/hero-wildlife-02.jpg",
  "/hero-wildlife-03.jpg",
  "/hero-wildlife-04.jpg",
  "/hero-wildlife-05.jpg",
  "/hero-wildlife-07.jpg",
  "/hero-wildlife-09.jpg",
  "/hero-wildlife-10.jpg",
  "/hero-wildlife-11.jpg",
  "/hero-wildlife-12.jpg",
];

interface PageBackdropProps {
  /** Override the default cycling images with page-specific ones */
  images?: string[];
  /** Cycle interval in ms (default 8000) */
  intervalMs?: number;
}

export function PageBackdrop({ images, intervalMs = 8000 }: PageBackdropProps = {}) {
  const srcs = images ?? DEFAULT_IMAGES;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (srcs.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % srcs.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [srcs.length, intervalMs]);

  return (
    <>
      {srcs.map((src, i) => (
        <div
          key={src}
          className="fixed inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${src}')`,
            opacity: i === activeIndex ? 1 : 0,
            zIndex: i === activeIndex ? 1 : 0,
            transition: "opacity 2s ease-in-out",
          }}
        />
      ))}
      <div className="fixed inset-0 z-[2] bg-gradient-to-b from-black/70 via-black/40 to-brand-cream/95" />
    </>
  );
}
