"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { PageBackdrop } from "~/app/_components/page-backdrop";
import { OfflineImage } from "~/app/_components/offline-image";
import { calculateDriveStats } from "~/lib/drive-stats";
import { formatDateTime } from "~/lib/format";

const DriveMap = dynamic(
  () => import("~/app/_components/map").then((mod) => mod.DriveMap),
  { ssr: false, loading: () => <div className="flex h-[50vh] items-center justify-center rounded-lg bg-brand-cream">Loading map...</div> },
);

const DriveFlythrough = dynamic(
  () => import("~/app/_components/drive-flythrough").then((mod) => mod.DriveFlythrough),
  { ssr: false },
);

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface DrivePhoto {
  url: string;
  lat: number | null;
  lng: number | null;
  caption: string | null;
}

function formatDistanceWithUnit(km: number, unit: string): string {
  if (unit === "mi") return `${(km / 1.609344).toFixed(1)} mi`;
  return `${km.toFixed(1)} km`;
}

function formatSpeedWithUnit(kmh: number, unit: string): string {
  if (unit === "mi") return `${(kmh / 1.609344).toFixed(1)} mph`;
  return `${kmh.toFixed(1)} km/h`;
}

export default function DriveDetailPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const driveId = params.id as string;
  const [showFlythrough, setShowFlythrough] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DrivePhoto | null>(null);

  const utils = api.useUtils();
  const drive = api.drive.detail.useQuery({ id: driveId });
  const userProfile = api.user.me.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const distanceUnit = userProfile.data?.distanceUnit ?? "km";

  const updateSighting = api.sighting.update.useMutation({
    onSuccess: () => void utils.drive.detail.invalidate({ id: driveId }),
  });
  const deleteSighting = api.sighting.delete.useMutation({
    onSuccess: () => void utils.drive.detail.invalidate({ id: driveId }),
  });

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-brand-khaki">Loading...</div>;
  }

  if (!session) {
    redirect("/auth/signin");
  }

  if (drive.isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-brand-khaki">Loading drive...</div>;
  }

  if (!drive.data) {
    return (
      <main className="relative min-h-screen">
        <PageBackdrop />
        <div className="relative z-10 mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-8">
          <p className="text-white/60">Drive not found.</p>
          <Link href="/drives" className="mt-2 text-sm text-brand-gold">
            Back to history
          </Link>
        </div>
      </main>
    );
  }

  const routePoints = (drive.data.route ?? []) as unknown as GpsPoint[];
  const photos = (drive.data.photos ?? []) as unknown as DrivePhoto[];
  const photoMarkers = photos
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({ url: p.url, lat: p.lat!, lng: p.lng!, caption: p.caption }));

  const sightingMarkers = drive.data.sightings.map((s) => ({
    id: s.id,
    lat: s.latitude,
    lng: s.longitude,
    speciesName: s.species.commonName,
    count: s.count,
    notes: s.notes,
  }));

  const stats = calculateDriveStats(routePoints, drive.data.sightings.length);

  if (showFlythrough) {
    return (
      <DriveFlythrough
        route={routePoints}
        photos={photoMarkers}
        sightings={sightingMarkers}
        onClose={() => setShowFlythrough(false)}
      />
    );
  }

  return (
    <main className="relative min-h-screen">
      <PageBackdrop />

      <div className="relative z-10 pb-8">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 pr-12 lg:pr-0">
            <Link
              href="/drives"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-white drop-shadow-md">Drive Detail</h1>
            {routePoints.length > 1 && (
              <button
                onClick={() => setShowFlythrough(true)}
                className="rounded-lg bg-brand-gold px-3 py-1 text-sm font-medium text-brand-dark hover:bg-brand-gold/80"
              >
                ▶ Flythrough
              </button>
            )}
          </div>

          <div className="mt-1 text-sm text-white/70">
            {drive.data.user.name} &middot;{" "}
            {formatDateTime(drive.data.startedAt)}
            {drive.data.endedAt && (
              <>
                {" "}&ndash;{" "}
                {new Date(drive.data.endedAt).toLocaleTimeString("en-ZA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </div>

          {stats.totalDistanceKm > 0 && (
            <div className="mt-3 flex flex-wrap gap-4">
              <StatBadge label="Distance" value={formatDistanceWithUnit(stats.totalDistanceKm, distanceUnit)} />
              <StatBadge label="Duration" value={formatDuration(stats.durationMinutes)} />
              <StatBadge label="Avg Speed" value={formatSpeedWithUnit(stats.avgSpeedKmh, distanceUnit)} />
              <StatBadge label="Max Speed" value={formatSpeedWithUnit(stats.maxSpeedKmh, distanceUnit)} />
              <StatBadge label="Sightings" value={`${stats.sightingsCount}`} />
            </div>
          )}
        </div>

        <div className="mx-auto max-w-7xl lg:flex lg:gap-4 lg:px-6">
          <div className="lg:flex-1">
            <DriveMap
              zoom={14}
              route={routePoints}
              sightings={sightingMarkers}
              photos={photoMarkers}
              className="h-[50dvh] w-full lg:h-[70dvh] lg:rounded-lg"
            />
          </div>

          <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 lg:w-96 lg:max-w-none lg:px-0 lg:pt-0">
            {drive.data.notes && (
              <div className="mb-4 rounded-lg bg-white/90 p-3 shadow-sm backdrop-blur">
                <div className="text-xs font-medium uppercase text-brand-khaki">Notes</div>
                <div className="mt-1 text-sm text-brand-dark">{drive.data.notes}</div>
              </div>
            )}

            {photos.length > 0 && (
              <>
                <h2 className="mb-2 text-lg font-semibold text-white drop-shadow-md">
                  Photos ({photos.length})
                </h2>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                  {photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPhoto(photo)}
                      className="overflow-hidden rounded-lg bg-white/90 shadow-sm backdrop-blur text-left"
                    >
                      <OfflineImage
                        src={photo.url}
                        alt={photo.caption ?? `Drive photo ${i + 1}`}
                        className="aspect-square w-full object-cover"
                        placeholderClassName="aspect-square w-full"
                      />
                      {photo.caption && (
                        <div className="px-2 py-1 text-xs text-brand-dark">{photo.caption}</div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            <h2 className="mb-2 text-lg font-semibold text-white drop-shadow-md">
              Sightings ({drive.data.sightings.length})
            </h2>

            {drive.data.sightings.length > 0 ? (
              <div className="space-y-2">
                {drive.data.sightings.map((sighting) => {
                  const imgSrc = sighting.imageUrl ?? sighting.species.imageUrl;
                  const isHeard = sighting.notes === "Heard only";
                  const displayNotes = isHeard ? null : sighting.notes;

                  return (
                    <div
                      key={sighting.id}
                      className="flex items-center gap-3 rounded-lg bg-white/90 p-2.5 shadow-sm backdrop-blur"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        <OfflineImage
                          src={imgSrc}
                          alt={sighting.species.commonName}
                          className="h-12 w-12 object-cover"
                          placeholderClassName="h-12 w-12"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-brand-dark">
                            {sighting.species.commonName}
                          </span>
                          {isHeard && (
                            <span className="shrink-0 rounded bg-brand-cream px-1.5 py-0.5 text-[10px] font-medium text-brand-khaki">
                              Heard
                            </span>
                          )}
                        </div>
                        {displayNotes && (
                          <div className="truncate text-xs text-brand-khaki">{displayNotes}</div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => {
                            if (sighting.count <= 1) {
                              deleteSighting.mutate({ id: sighting.id });
                            } else {
                              updateSighting.mutate({ id: sighting.id, count: sighting.count - 1 });
                            }
                          }}
                          disabled={updateSighting.isPending || deleteSighting.isPending}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-red-600 transition active:scale-90 active:bg-red-500/30"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-semibold text-brand-dark">
                          {sighting.count}
                        </span>
                        <button
                          onClick={() => updateSighting.mutate({ id: sighting.id, count: sighting.count + 1 })}
                          disabled={updateSighting.isPending}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green/15 text-brand-green transition active:scale-90 active:bg-brand-green/30"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-white/60">No sightings recorded during this drive.</p>
            )}

          </div>
        </div>

        {routePoints.length > 1 && (
          <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
            <DriveTimeline
              route={routePoints}
              photos={photoMarkers}
              sightings={sightingMarkers}
            />
          </div>
        )}
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-h-[90vh] max-w-[90vw]">
            <OfflineImage
              src={selectedPhoto.url}
              alt={selectedPhoto.caption ?? "Drive photo"}
              className="max-h-[85vh] w-auto rounded-xl object-contain"
              placeholderClassName="h-64 w-64"
            />
            {selectedPhoto.caption && (
              <div className="mt-2 text-center text-sm text-white">{selectedPhoto.caption}</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur">
      <div className="text-[10px] font-medium uppercase text-white/50">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

interface TimelineProps {
  route: { lat: number; lng: number; timestamp: string }[];
  photos: { lat: number; lng: number; url: string; caption?: string | null }[];
  sightings: { id: string; lat: number; lng: number; speciesName: string }[];
}

function DriveTimeline({ route, photos, sightings }: TimelineProps) {
  const startTime = new Date(route[0]!.timestamp).getTime();
  const endTime = new Date(route[route.length - 1]!.timestamp).getTime();
  const duration = endTime - startTime;

  if (duration <= 0) return null;

  const findClosestTimePosition = (lat: number, lng: number): number => {
    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < route.length; i++) {
      const dx = route[i]!.lat - lat;
      const dy = route[i]!.lng - lng;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    const t = new Date(route[closestIdx]!.timestamp).getTime();
    return ((t - startTime) / duration) * 100;
  };

  return (
    <div className="rounded-lg bg-white/10 p-3 backdrop-blur">
      <div className="text-xs font-medium uppercase text-white/50 mb-2">Timeline</div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20" />
        {photos.map((p, i) => (
          <div
            key={`p-${i}`}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${findClosestTimePosition(p.lat, p.lng)}%` }}
            title={p.caption ?? "Photo"}
          >
            <div className="h-3 w-3 rounded-full bg-blue-500 border border-white" />
          </div>
        ))}
        {sightings.map((s) => (
          <div
            key={s.id}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${findClosestTimePosition(s.lat, s.lng)}%` }}
            title={s.speciesName}
          >
            <div className="h-3 w-3 rounded-full bg-red-500 border border-white" />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/40">
        <span>{new Date(startTime).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</span>
        <span>{new Date(endTime).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}
