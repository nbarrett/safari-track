"use client";

import { useState, useCallback } from "react";

interface OfflineImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onClick?: () => void;
}

export function OfflineImage({
  src,
  alt,
  className = "",
  placeholderClassName = "",
  onClick,
}: OfflineImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "fallback" | "placeholder">(
    src ? "loading" : "placeholder",
  );
  const [currentSrc, setCurrentSrc] = useState(src ?? "");

  const handleError = useCallback(async () => {
    if (status === "fallback" || status === "placeholder" || !src) {
      setStatus("placeholder");
      return;
    }

    try {
      const cache = await caches.open("species-images");
      const cachedKeys = await cache.keys();
      const match = cachedKeys.find((req) => {
        const url = new URL(req.url);
        const srcUrl = new URL(src, window.location.origin);
        return url.pathname === srcUrl.pathname || req.url.includes(alt.replace(/\s+/g, "_"));
      });

      if (match) {
        setCurrentSrc(match.url);
        setStatus("fallback");
        return;
      }
    } catch {
      // caches API unavailable
    }

    setStatus("placeholder");
  }, [src, alt, status]);

  if (status === "placeholder" || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-brand-cream/50 ${placeholderClassName || className}`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
      >
        <span className="px-2 text-center text-xs text-brand-khaki">{alt}</span>
      </div>
    );
  }

  return (
    <>
      <img
        src={currentSrc}
        alt={alt}
        crossOrigin="anonymous"
        loading="lazy"
        onLoad={() => setStatus("loaded")}
        onError={() => void handleError()}
        className={`${className} ${status === "loading" ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        onClick={onClick}
      />
      {status === "loading" && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-brand-cream/50 ${placeholderClassName || className}`}
        >
          <span className="px-2 text-center text-xs text-brand-khaki">{alt}</span>
        </div>
      )}
    </>
  );
}
