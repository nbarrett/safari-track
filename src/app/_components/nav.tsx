"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { clearCachedSession } from "~/lib/session-cache";
import { api } from "~/trpc/react";
import { OfflineIndicator } from "~/app/_components/offline-indicator";
import { PrecacheIndicator } from "~/app/_components/precache-indicator";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/lodges", label: "Camps" },
  { href: "/drive", label: "Drive" },
  { href: "/checklist", label: "Checklist" },
  { href: "/drives", label: "History" },
  { href: "/strava", label: "Strava" },
  { href: "/admin/species", label: "Species", adminOnly: true },
  { href: "/admin/roads", label: "Roads", adminOnly: true },
  { href: "/admin/settings", label: "Settings", adminOnly: true },
] as const;

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

  if (!session) return null;

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-brand-brown/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex-shrink-0 py-4">
              <Image
                src="/logo-white.png"
                alt="Safari Track"
                width={180}
                height={104}
                className="h-[calc(var(--spacing)*14)] w-auto lg:h-[calc(var(--spacing)*21)]"
                priority
              />
            </Link>
            {lodge.data && (
              <div className="hidden border-l border-white/20 pl-6 lg:block">
                <div className="text-lg font-semibold text-white">{lodge.data.name}</div>
              </div>
            )}
            <OfflineIndicator />
            <PrecacheIndicator />
            <div className="hidden items-center gap-2 lg:flex">
              {NAV_ITEMS.filter((item) => !("adminOnly" in item && item.adminOnly) || session?.user?.role === "ADMIN").map((item) => {
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
          <button
            onClick={() => void handleSignOut()}
            className="hidden rounded-md px-5 py-3 text-lg font-medium text-white/50 transition hover:text-white lg:block"
          >
            Sign Out
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 text-white lg:hidden"
            aria-label="Open menu"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[9999] flex flex-col bg-brand-brown transition-opacity duration-200 lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" onClick={closeMenu} className="flex-shrink-0">
            <Image
              src="/logo-white.png"
              alt="Safari Track"
              width={180}
              height={104}
              className="h-[calc(var(--spacing)*14)] w-auto"
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
              <div className="text-lg font-semibold text-white">{lodge.data.name}</div>
            </div>
          )}
          <div className="flex flex-1 flex-col py-4">
            {NAV_ITEMS.filter((item) => !("adminOnly" in item && item.adminOnly) || session?.user?.role === "ADMIN").map((item) => {
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
          <div className="flex items-center justify-between border-t border-white/10 py-6">
            <OfflineIndicator />
            <PrecacheIndicator />
            <button
              onClick={() => void handleSignOut()}
              className="text-lg font-medium text-white/50 transition hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
