"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { clearCachedSession } from "~/lib/session-cache";
import { APP_VERSION } from "~/lib/version";
import { api } from "~/trpc/react";
import { OfflineIndicator } from "~/app/_components/offline-indicator";
import { PrecacheIndicator } from "~/app/_components/precache-indicator";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/lodges", label: "Lodges" },
  { href: "/drive", label: "Drive", authOnly: true },
  { href: "/checklist", label: "Checklist" },
  { href: "/drives", label: "History", authOnly: true },
  { href: "/profile", label: "Profile", authOnly: true },
  { href: "/strava", label: "Strava", authOnly: true },
  { href: "/admin/species", label: "Species", adminOnly: true },
  { href: "/admin/roads", label: "Roads", adminOnly: true },
  { href: "/admin/settings", label: "Settings", adminOnly: true },
] as const;

const HIDE_MOBILE_BAR = ["/drive"];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const lodge = api.lodge.mine.useQuery(undefined, {
    enabled: !!session,
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleSignOut = useCallback(async () => {
    closeMenu();
    clearCachedSession();
    await signOut({ redirect: false });
    window.location.href = "/auth/signin";
  }, [closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeMenu]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if ("adminOnly" in item && item.adminOnly) return session?.user?.role === "ADMIN";
    if ("authOnly" in item && item.authOnly) return !!session;
    return true;
  });

  const hideMobileBar = HIDE_MOBILE_BAR.includes(pathname);

  return (
    <>
      <nav className="sticky top-0 z-50 hidden border-b border-white/10 bg-brand-brown/95 backdrop-blur-sm lg:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <OfflineIndicator />
            <PrecacheIndicator />
            <div className="flex items-center gap-2">
              {visibleItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-5 py-3 text-lg font-medium transition ${
                      active
                        ? "text-brand-gold"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/changelog"
              className="text-sm text-white/30 transition hover:text-white/60"
            >
              v{APP_VERSION}
            </Link>
            {session ? (
              <button
                onClick={() => void handleSignOut()}
                className="rounded-md px-5 py-3 text-lg font-medium text-white/50 transition hover:text-white"
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-md px-5 py-3 text-lg font-medium text-white/50 transition hover:text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {!hideMobileBar && (
        <nav className="fixed right-0 top-0 z-50 pt-[env(safe-area-inset-top)] lg:hidden">
          <div className="flex items-center justify-end px-4 py-2">
            <div className="flex items-center gap-3">
              <OfflineIndicator />
              <PrecacheIndicator />
              <button
                onClick={() => setMenuOpen(true)}
                className="rounded-full bg-black/30 p-2 text-white backdrop-blur-sm"
                aria-label="Open menu"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </nav>
      )}
      {!hideMobileBar && (
        <div className="h-[calc(env(safe-area-inset-top)+3.5rem)] lg:hidden" />
      )}

      <div
        className={`fixed inset-0 z-[9999] flex flex-col bg-brand-brown transition-opacity duration-200 lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" onClick={closeMenu} className="flex-shrink-0">
            <Image
              src="/logo-icon.png"
              alt="Safari Track"
              width={240}
              height={112}
              className="h-20 w-auto"
            />
          </Link>
          <button
            onClick={closeMenu}
            className="p-2 text-white"
            aria-label="Close menu"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col px-6">
          {lodge.data && (
            <div className="border-b border-white/10 pb-4">
              {lodge.data.brand && (
                <div className="text-xs font-medium uppercase tracking-wider text-white/50">{lodge.data.brand}</div>
              )}
              <div className="text-lg font-semibold text-white">{lodge.data.name}</div>
            </div>
          )}
          <div className="flex flex-1 flex-col py-4">
            {visibleItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={`py-4 text-xl font-medium transition ${
                    active
                      ? "text-brand-gold"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Link
              href="/changelog"
              onClick={closeMenu}
              className="text-sm text-white/30 transition hover:text-white/60"
            >
              v{APP_VERSION}
            </Link>
            <div className="flex items-center gap-3">
              <OfflineIndicator />
              <PrecacheIndicator />
            </div>
            {session ? (
              <button
                onClick={() => void handleSignOut()}
                className="text-lg font-medium text-white/50 transition hover:text-white"
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/auth/signin"
                onClick={closeMenu}
                className="text-lg font-medium text-white/50 transition hover:text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
