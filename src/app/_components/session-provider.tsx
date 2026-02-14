"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import { cacheSession, clearCachedSession, getCachedSession } from "~/lib/session-cache";

function SessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (session) {
      cacheSession(session);
    } else {
      clearCachedSession();
    }
  }, [session, status]);

  return null;
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [cachedSession, setCachedSession] = useState<Session | undefined>(undefined);

  useEffect(() => {
    const stored = getCachedSession();
    if (stored) setCachedSession(stored);
  }, []);

  return (
    <SessionProvider session={cachedSession} refetchWhenOffline={false}>
      <SessionSync />
      {children}
    </SessionProvider>
  );
}
