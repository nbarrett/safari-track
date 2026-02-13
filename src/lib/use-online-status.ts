"use client";

import { useEffect, useSyncExternalStore } from "react";
import { startListening } from "~/lib/sync-manager";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

let syncStarted = false;

export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!syncStarted) {
      startListening();
      syncStarted = true;
    }
  }, []);

  return { isOnline };
}
