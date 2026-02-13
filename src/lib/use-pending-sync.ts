"use client";

import { useCallback, useEffect, useState } from "react";
import { count } from "~/lib/offline-queue";
import { onSyncEvent } from "~/lib/sync-manager";

export function usePendingSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const c = await count();
    setPendingCount(c);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const unsub = onSyncEvent((event) => {
      if (event.type === "sync-started") {
        setSyncing(true);
      }
      if (event.type === "sync-progress") {
        setPendingCount(event.remaining ?? 0);
      }
      if (event.type === "sync-complete") {
        setSyncing(false);
        setLastSyncedAt(new Date());
        void refresh();
      }
      if (event.type === "sync-failed") {
        setSyncing(false);
        void refresh();
      }
    });
    return unsub;
  }, [refresh]);

  return { pendingCount, syncing, lastSyncedAt };
}
