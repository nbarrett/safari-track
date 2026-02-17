"use client";

import { SerwistProvider } from "@serwist/next/react";
import { type ReactNode, useEffect, useState } from "react";

function UpdateBanner({ onReload }: { onReload: () => void }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[9998] flex items-center justify-center gap-3 bg-brand-brown px-4 py-3 text-sm text-white shadow-lg" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
      <span>A new version is available</span>
      <button
        onClick={onReload}
        className="rounded-md bg-white/20 px-3 py-1 text-xs font-medium transition hover:bg-white/30"
      >
        Update now
      </button>
    </div>
  );
}

export function SwProvider({ children }: { children: ReactNode }) {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const markReady = () => {
      if (refreshing) return;
      refreshing = true;
      setUpdateReady(true);
    };

    // Fallback: catch controller changes directly
    navigator.serviceWorker.addEventListener("controllerchange", markReady);

    // Actively monitor the registration for updates
    void navigator.serviceWorker.ready.then((registration) => {
      // A worker may already be waiting (e.g. skipWaiting didn't fire yet)
      if (registration.waiting) {
        markReady();
        return;
      }

      // Listen for newly-found service workers
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated") markReady();
        });
      });

      // Trigger an immediate update check, then poll every 60s
      void registration.update().catch(() => {});
      intervalId = setInterval(() => {
        void registration.update().catch(() => {});
      }, 60_000);
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", markReady);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <SerwistProvider swUrl="/sw.js" reloadOnOnline={false}>
      {updateReady && <UpdateBanner onReload={() => window.location.reload()} />}
      {children}
    </SerwistProvider>
  );
}
