"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { OfflineIndicator } from "~/app/_components/offline-indicator";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/lodges", label: "Camps" },
  { href: "/drive", label: "Drive" },
  { href: "/checklist", label: "Checklist" },
  { href: "/drives", label: "History" },
  { href: "/strava", label: "Strava" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const lodge = api.lodge.mine.useQuery(undefined, {
    enabled: !!session,
  });

  if (!session) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-brand-brown/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex-shrink-0 py-4">
            <Image
              src="/logo-white.png"
              alt="Klaserie Camps"
              width={180}
              height={104}
              className="h-[calc(var(--spacing)*21)] w-auto"
              priority
            />
          </Link>
          {lodge.data && (
            <div className="border-l border-white/20 pl-6">
              <div className="text-lg font-semibold text-white">{lodge.data.name}</div>
              <div className="text-xs text-brand-gold/80">Klaserie Private Nature Reserve</div>
            </div>
          )}
          <OfflineIndicator />
          <div className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
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
          onClick={() => signOut()}
          className="rounded-md px-5 py-3 text-lg font-medium text-white/50 transition hover:text-white"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
