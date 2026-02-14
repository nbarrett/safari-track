"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "~/trpc/react";
import { useGpsTracker, clearPersistedBuffer } from "~/app/_components/gps-tracker";
import { SightingForm } from "~/app/_components/sighting-form";
import { useOfflineMutation } from "~/lib/use-offline-mutation";
import { generateTempId, enqueue } from "~/lib/offline-queue";
import { getLocalDrive, setLocalDrive, clearLocalDrive, addLocalRoutePoints } from "~/lib/drive-store";

const DriveMap = dynamic(
  () => import("~/app/_components/map").then((mod) => mod.DriveMap),
  { ssr: false, loading: () => <div className="flex flex-1 items-center justify-center bg-brand-cream">Loading map...</div> },
);

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hrs > 0
    ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;
}

function useDriveElapsed(startedAt: Date | string | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }

    const start = new Date(startedAt).getTime();

    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsed;
}

export default function DrivePage() {
  const { data: session, status } = useSession();
  const [routePoints, setRoutePoints] = useState<GpsPoint[]>([]);
  const [sightingLocation, setSightingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [localDriveId, setLocalDriveId] = useState<string | null>(null);
  const [localStartedAt, setLocalStartedAt] = useState<string | null>(null);

  const utils = api.useUtils();

  useEffect(() => {
    void getLocalDrive().then((drive) => {
      if (drive) {
        setLocalDriveId(drive.id);
        setLocalStartedAt(drive.startedAt);
        setRoutePoints(drive.routePoints);
      }
    });
  }, []);

  const activeDrive = api.drive.active.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const startDriveMutation = api.drive.start.useMutation();
  const endDriveMutation = api.drive.end.useMutation();
  const addRoutePointsMutation = api.drive.addRoutePoints.useMutation();

  const sendingRef = useRef(false);

  const offlineAddRoutePoints = useOfflineMutation({
    path: "drive.addRoutePoints",
    mutationFn: (input: { id: string; points: GpsPoint[] }) =>
      addRoutePointsMutation.mutateAsync(input),
  });

  const offlineEndDrive = useOfflineMutation({
    path: "drive.end",
    mutationFn: (input: { id: string }) => endDriveMutation.mutateAsync(input),
    onSuccess: () => {
      setRoutePoints([]);
      setMutationError(null);
      setLocalDriveId(null);
      setLocalStartedAt(null);
      void clearLocalDrive();
      void clearPersistedBuffer();
      void utils.drive.active.invalidate();
      void utils.drive.list.invalidate();
    },
    onError: (err) => setMutationError(err.message),
    onOfflineQueued: () => {
      setRoutePoints([]);
      setLocalDriveId(null);
      setLocalStartedAt(null);
      void clearLocalDrive();
      void clearPersistedBuffer();
    },
  });

  const driveId = activeDrive.data?.id ?? localDriveId;
  const driveIdRef = useRef(driveId);
  driveIdRef.current = driveId;

  const handleGpsPoints = useCallback(
    (points: GpsPoint[]) => {
      setRoutePoints((prev) => [...prev, ...points]);
      void addLocalRoutePoints(points);
      const id = driveIdRef.current;
      if (!id || sendingRef.current) return;
      sendingRef.current = true;
      offlineAddRoutePoints
        .mutateAsync({ id, points })
        .finally(() => {
          sendingRef.current = false;
        });
    },
    [offlineAddRoutePoints],
  );

  const { tracking, error: gpsError, currentPosition, startTracking, stopTracking } =
    useGpsTracker({
      intervalMs: 10000,
      driveId,
      onPoints: handleGpsPoints,
    });

  const driveSession = activeDrive.data;
  const elapsed = useDriveElapsed(driveSession?.startedAt ?? localStartedAt);
  const existingRoute = (driveSession?.route ?? []) as unknown as GpsPoint[];
  const allRoutePoints = [...existingRoute, ...routePoints];

  const sightingMarkers = (driveSession?.sightings ?? []).map((s) => ({
    id: s.id,
    lat: s.latitude,
    lng: s.longitude,
    speciesName: s.species.commonName,
    count: s.count,
    notes: s.notes,
  }));

  if (status === "loading") {
    return <div className="flex flex-1 items-center justify-center text-brand-khaki">Loading...</div>;
  }

  if (!session) {
    redirect("/auth/signin");
  }

  const handleMapClick = (lat: number, lng: number) => {
    if (driveSession ?? localDriveId) {
      setSightingLocation({ lat, lng });
    }
  };

  const handleStartDrive = async () => {
    setMutationError(null);
    setStarting(true);
    void clearPersistedBuffer();

    if (!navigator.onLine) {
      const tempId = generateTempId();
      const now = new Date().toISOString();
      setLocalDriveId(tempId);
      setLocalStartedAt(now);
      void setLocalDrive({ id: tempId, startedAt: now, routePoints: [], sightings: [] });
      void enqueue("drive.start", { tempId });
      startTracking();
      setStarting(false);
      return;
    }

    try {
      const created = await startDriveMutation.mutateAsync();
      const startedIso = created.startedAt.toISOString();
      setLocalDriveId(created.id);
      setLocalStartedAt(startedIso);
      void setLocalDrive({ id: created.id, startedAt: startedIso, routePoints: [], sightings: [] });
      startTracking();
      void utils.drive.active.invalidate();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to start drive");
    } finally {
      setStarting(false);
    }
  };

  const handleEndDrive = () => {
    stopTracking();
    const id = driveSession?.id ?? localDriveId;
    if (id) {
      offlineEndDrive.mutate({ id });
    }
  };

  const mapCenter: [number, number] = currentPosition
    ? [currentPosition.lat, currentPosition.lng]
    : [-24.25, 31.15];

  const isActive = !!driveSession || !!localDriveId || starting;

  return (
    <main className="relative min-h-0 flex-1">
      <DriveMap
        center={mapCenter}
        zoom={15}
        route={allRoutePoints}
        sightings={sightingMarkers}
        onMapClick={isActive ? handleMapClick : undefined}
        className="h-full w-full"
      />

      {isActive && (
        <div className="absolute inset-x-0 top-0 z-[1000] flex items-center justify-center gap-6 bg-brand-dark/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${tracking ? "animate-pulse bg-brand-green" : "bg-brand-gold"}`} />
            <span className="text-sm font-medium text-white">
              {tracking ? "On Drive" : "Paused"}
            </span>
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums text-white">
            {formatDuration(elapsed)}
          </div>
          <div className="flex items-center gap-4 text-sm text-white/70">
            <span>{sightingMarkers.length} sightings</span>
            <span>{allRoutePoints.length} pts</span>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-[1000] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {(gpsError ?? mutationError) && (
          <div className="mx-4 mb-2 rounded-lg bg-red-700/90 px-4 py-2 text-sm text-white backdrop-blur-sm">
            {mutationError ?? gpsError}
          </div>
        )}

        {sightingLocation && (driveSession?.id ?? localDriveId) && (
          <div className="mx-4 mb-3">
            <SightingForm
              driveSessionId={(driveSession?.id ?? localDriveId)!}
              latitude={sightingLocation.lat}
              longitude={sightingLocation.lng}
              onComplete={() => {
                setSightingLocation(null);
                void utils.drive.active.invalidate();
              }}
              onCancel={() => setSightingLocation(null)}
            />
          </div>
        )}

        <div className="mx-4">
          {!isActive ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/95 p-6 shadow-xl backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-lg font-bold text-brand-dark">Game Drive</h2>
                <p className="mt-1 text-sm text-brand-khaki">
                  Track your route and log wildlife sightings
                </p>
              </div>
              <button
                onClick={handleStartDrive}
                disabled={startDriveMutation.isPending}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-green text-lg font-bold text-white shadow-lg transition hover:bg-brand-green-light active:scale-95 disabled:opacity-50"
              >
                {startDriveMutation.isPending ? (
                  <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  "GO"
                )}
              </button>
            </div>
          ) : starting && !driveSession && !localDriveId ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 p-6 shadow-xl backdrop-blur-sm">
              <svg className="h-8 w-8 animate-spin text-brand-green" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium text-brand-dark">Starting game drive...</span>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-2">
                {tracking ? (
                  <button
                    onClick={stopTracking}
                    className="flex flex-col items-center gap-1 rounded-xl bg-brand-gold/20 px-3 py-3 transition active:scale-95"
                  >
                    <svg className="h-6 w-6 text-brand-dark" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    <span className="text-xs font-semibold text-brand-dark">Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={startTracking}
                    className="flex flex-col items-center gap-1 rounded-xl bg-brand-green/20 px-3 py-3 transition active:scale-95"
                  >
                    <svg className="h-6 w-6 text-brand-green" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="text-xs font-semibold text-brand-green">Resume</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const pos = currentPosition ?? { lat: mapCenter[0], lng: mapCenter[1] };
                    setSightingLocation(pos);
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl bg-brand-brown/10 px-3 py-3 transition active:scale-95"
                >
                  <svg className="h-6 w-6 text-brand-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs font-semibold text-brand-brown">Sighting</span>
                </button>

                <button
                  onClick={handleEndDrive}
                  disabled={offlineEndDrive.isPending}
                  className="flex flex-col items-center gap-1 rounded-xl bg-red-50 px-3 py-3 transition active:scale-95 disabled:opacity-50"
                >
                  <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                  <span className="text-xs font-semibold text-red-600">
                    {offlineEndDrive.isPending ? "Ending..." : "Finish"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
