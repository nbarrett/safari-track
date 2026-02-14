"use client";

import { useEffect, useState, useCallback } from "react";
import { onSyncEvent, drainQueue } from "~/lib/sync-manager";
import { count } from "~/lib/offline-queue";
import { useOnlineStatus } from "~/lib/use-online-status";

export function SyncIndicator() {
  const { isOnline } = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const refreshCount = useCallback(async () => {
    const c = await count();
    setPending(c);
  }, []);

  useEffect(() => {
    void refreshCount();

    const unsub = onSyncEvent((event) => {
      if (event.type === "sync-started") {
        setSyncing(true);
        setJustCompleted(false);
      }
      if (event.type === "sync-progress") {
        setPending(event.remaining ?? 0);
      }
      if (event.type === "sync-complete") {
        setSyncing(false);
        setPending(0);
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 3000);
      }
      if (event.type === "sync-failed") {
        setSyncing(false);
        void refreshCount();
      }
    });

    return unsub;
  }, [refreshCount]);

  useEffect(() => {
    if (!isOnline) return;

    void drainQueue();

    const interval = setInterval(() => {
      void drainQueue();
    }, 30_000);

    return () => clearInterval(interval);
  }, [isOnline]);

  useEffect(() => {
    const interval = setInterval(() => void refreshCount(), 5_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  if (pending === 0 && !syncing && !justCompleted) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition-all ${
          justCompleted
            ? "bg-brand-green/90 text-white"
            : syncing
              ? "bg-brand-gold/90 text-white"
              : "bg-brand-brown/90 text-white"
        }`}
      >
        {justCompleted ? (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Synced
          </>
        ) : syncing ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Syncing {pending}
          </>
        ) : (
          <>
            <div className="h-2 w-2 rounded-full bg-white/80" />
            {pending} pending
          </>
        )}
      </div>
    </div>
  );
}
