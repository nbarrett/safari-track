"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "~/lib/use-online-status";
import { usePendingSync } from "~/lib/use-pending-sync";

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();
  const { pendingCount, syncing, lastSyncedAt } = usePendingSync();
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (lastSyncedAt && pendingCount === 0) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncedAt, pendingCount]);

  if (syncing) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-brand-gold/20 px-3 py-1">
        <svg className="h-3.5 w-3.5 animate-spin text-brand-gold" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs font-medium text-brand-gold">
          Syncing{pendingCount > 0 ? ` (${pendingCount})` : ""}...
        </span>
      </div>
    );
  }

  if (showSynced) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-brand-green/20 px-3 py-1">
        <svg className="h-3.5 w-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-xs font-medium text-brand-green">Synced</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1">
        <div className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-xs font-medium text-amber-400">
          Offline{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-brand-gold/20 px-3 py-1">
        <div className="h-2 w-2 rounded-full bg-brand-gold" />
        <span className="text-xs font-medium text-brand-gold">{pendingCount} pending</span>
      </div>
    );
  }

  return null;
}
