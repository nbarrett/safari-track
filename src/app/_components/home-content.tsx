"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";
import { getLocalDrive } from "~/lib/drive-store";
import { formatDateTime } from "~/lib/format";

interface HomeContentProps {
  userName: string;
}

export function HomeContent({ userName }: HomeContentProps) {
  const activeDrive = api.drive.active.useQuery();
  const [hasLocalDrive, setHasLocalDrive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void getLocalDrive().then((drive) => {
      setHasLocalDrive(!!drive);
      const isIntentional = new URLSearchParams(window.location.search).has("home");
      if (drive && !isIntentional) {
        router.replace("/drive");
      }
    });
  }, [router]);
  const recentSightings = api.sighting.recent.useQuery({ limit: 5 });
  const recentDrives = api.drive.list.useQuery({ limit: 5 });
  const lodge = api.lodge.mine.useQuery();

  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="home-hero mb-6 flex flex-col items-center text-center">
          {lodge.data?.logoUrl ? (
            <img
              src={lodge.data.logoUrl}
              alt={lodge.data.name}
              className="home-hero-logo h-[180px] w-auto object-contain lg:h-[220px]"
            />
          ) : (
            <Image
              src="/logo-icon.png"
              alt="Safari Track"
              width={768}
              height={512}
              className="home-hero-logo h-[180px] w-auto lg:h-[220px]"
              priority
            />
          )}
          {lodge.data && (
            <div className="home-hero-lodge mt-3">
              {lodge.data.brand && (
                <div className="text-xs font-medium uppercase tracking-widest text-white/50">
                  {lodge.data.brand}
                </div>
              )}
              <div className="text-lg font-semibold text-white drop-shadow-md">
                {lodge.data.name}
              </div>
            </div>
          )}
          <p className="home-hero-welcome mt-2 text-sm text-white/60">
            Welcome back, {userName}
          </p>
        </div>

        {activeDrive.data || hasLocalDrive ? (
          <div className="mb-6 flex items-stretch gap-2">
            <Link
              href="/drive"
              className="flex-1 rounded-lg border border-brand-gold/30 bg-brand-brown/90 p-4 text-white shadow-lg backdrop-blur-sm"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-brand-gold">
                Active Drive
              </div>
              <div className="mt-1 text-lg font-semibold">
                {activeDrive.data
                  ? `${activeDrive.data.sightings.length} sightings recorded`
                  : "Return to Drive"}
              </div>
              <div className="mt-2 text-sm text-brand-cream/80">Tap to continue tracking</div>
            </Link>
            <Link
              href="/drive?photo=1"
              className="flex items-center justify-center rounded-lg border border-blue-400/30 bg-brand-brown/90 px-4 shadow-lg backdrop-blur-sm transition active:scale-95"
              title="Add photo"
            >
              <svg className="h-7 w-7 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </Link>
          </div>
        ) : (
          <Link
            href="/drive"
            className="mb-6 block rounded-lg border border-brand-gold/30 bg-brand-brown/90 p-4 text-center text-white shadow-lg backdrop-blur-sm"
          >
            <div className="text-lg font-semibold">Start New Drive</div>
            <div className="mt-1 text-sm text-brand-cream/80">Begin GPS tracking and log sightings</div>
          </Link>
        )}

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-white drop-shadow-md">Recent Sightings</h2>
          {recentSightings.data && recentSightings.data.length > 0 ? (
            <div className="space-y-2">
              {recentSightings.data.map((sighting) => (
                <div
                  key={sighting.id}
                  className="flex items-center justify-between rounded-lg bg-white/80 p-3 shadow-sm backdrop-blur-sm"
                >
                  <div>
                    <div className="font-medium text-brand-dark">
                      {sighting.species.commonName}
                    </div>
                    <div className="text-xs text-brand-khaki">
                      by {sighting.user.name} &middot; {sighting.count} seen
                    </div>
                  </div>
                  <div className="text-xs text-brand-khaki/70">
                    {formatDateTime(sighting.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">No sightings yet. Start a drive to log wildlife.</p>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white drop-shadow-md">Recent Drives</h2>
            <Link href="/drives" className="text-sm text-brand-gold hover:text-brand-gold/80">
              View all
            </Link>
          </div>
          {recentDrives.data && recentDrives.data.items.length > 0 ? (
            <div className="space-y-2">
              {recentDrives.data.items.map((drive) => (
                <Link
                  key={drive.id}
                  href={`/drives/${drive.id}`}
                  className="flex items-center justify-between rounded-lg bg-white/80 p-3 shadow-sm backdrop-blur-sm"
                >
                  <div>
                    <div className="font-medium text-brand-dark">{drive.user.name}</div>
                    <div className="text-xs text-brand-khaki">
                      {drive._count.sightings} sighting{drive._count.sightings !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-brand-khaki/70">
                      {formatDateTime(drive.startedAt)}
                    </div>
                    <div className="text-xs text-brand-khaki/70">
                      {drive.endedAt ? "Completed" : "In Progress"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">No drives recorded yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
