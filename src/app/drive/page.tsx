"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { App } from "@capacitor/app";
import { isNative } from "~/lib/native";
import { useGpsTracker, clearPersistedBuffer } from "~/app/_components/gps-tracker";
import { QuickSightingPanel } from "~/app/_components/quick-sighting";
import { TripSummary } from "~/app/_components/trip-summary";
import { PhotoCapture } from "~/app/_components/photo-capture";
import { useOfflineMutation } from "~/lib/use-offline-mutation";
import { generateTempId, enqueue } from "~/lib/offline-queue";
import { getLocalDrive, setLocalDrive, clearLocalDrive, addLocalRoutePoints, addLocalSighting } from "~/lib/drive-store";
import { getActiveTrip, addDriveToTrip, setActiveTrip, updateTripSpecies, type TripSpecies } from "~/lib/trip-store";
import { haversineDistance } from "~/lib/drive-stats";

const DriveMap = dynamic(
  () => import("~/app/_components/map").then((mod) => mod.DriveMap),
  { ssr: false, loading: () => <div className="flex flex-1 items-center justify-center bg-brand-cream">Loading map...</div> },
);

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface QuickSpecies {
  speciesId: string;
  commonName: string;
  category: string;
  imageUrl: string | null;
  count: number;
  lastSightedAt: number;
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

function formatDistance(metres: number, unit: string): string {
  if (unit === "mi") return `${(metres / 1609.344).toFixed(1)} mi`;
  return `${(metres / 1000).toFixed(1)} km`;
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
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [localDriveId, setLocalDriveId] = useState<string | null>(null);
  const [localStartedAt, setLocalStartedAt] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showTripSummary, setShowTripSummary] = useState(false);
  const [initialQuickSpecies, setInitialQuickSpecies] = useState<QuickSpecies[]>([]);
  const [hasActiveTrip, setHasActiveTrip] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [localSightingCount, setLocalSightingCount] = useState(0);
  const [localSpeciesCount, setLocalSpeciesCount] = useState(0);
  const [routeOverview, setRouteOverview] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const router = useRouter();

  const utils = api.useUtils();

  useEffect(() => {
    void getLocalDrive().then((drive) => {
      if (drive) {
        setLocalDriveId(drive.id);
        setLocalStartedAt(drive.startedAt);
        setRoutePoints(drive.routePoints);
        if (drive.speciesSummary && drive.speciesSummary.length > 0) {
          setInitialQuickSpecies(drive.speciesSummary);
          const total = drive.speciesSummary.reduce((sum, s) => sum + s.count, 0);
          setLocalSightingCount(total);
          setLocalSpeciesCount(drive.speciesSummary.length);
        }
      }
    });
    void getActiveTrip().then((trip) => {
      setHasActiveTrip(!!trip);
    });
  }, []);

  const activeDrive = api.drive.active.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const poisQuery = api.poi.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const poiMarkers = (poisQuery.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    icon: p.icon,
    lat: p.latitude,
    lng: p.longitude,
  }));

  const allSpecies = api.species.list.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });

  const createPoiMutation = api.poi.create.useMutation({
    onSuccess: () => void utils.poi.list.invalidate(),
  });

  const startDriveMutation = api.drive.start.useMutation();
  const endDriveMutation = api.drive.end.useMutation();
  const discardDriveMutation = api.drive.discard.useMutation();
  const addRoutePointsMutation = api.drive.addRoutePoints.useMutation();

  const createSightingMutation = api.sighting.create.useMutation();

  const offlineCreateSighting = useOfflineMutation({
    path: "sighting.create",
    mutationFn: (input: {
      driveSessionId: string;
      speciesId: string;
      latitude: number;
      longitude: number;
      count: number;
      createdAt?: string;
    }) => createSightingMutation.mutateAsync(input),
  });

  const sendingRef = useRef(false);
  const pendingPointsRef = useRef<GpsPoint[]>([]);

  const offlineAddRoutePoints = useOfflineMutation({
    path: "drive.addRoutePoints",
    mutationFn: (input: { id: string; points: GpsPoint[] }) =>
      addRoutePointsMutation.mutateAsync(input),
  });

  const savedDriveIdRef = useRef<string | null>(null);

  const offlineEndDrive = useOfflineMutation({
    path: "drive.end",
    mutationFn: (input: { id: string }) => endDriveMutation.mutateAsync(input),
    onSuccess: (result, input) => {
      if (!result) return;
      const savedId = savedDriveIdRef.current ?? input.id;
      setRoutePoints([]);
      setMutationError(null);
      setLocalDriveId(null);
      setLocalStartedAt(null);
      setInitialQuickSpecies([]);
      setShowFinishModal(false);
      void clearLocalDrive();
      void clearPersistedBuffer();
      void utils.drive.active.invalidate();
      void utils.drive.list.invalidate();
      router.push(`/drives/${savedId}`);
    },
    onError: (err) => {
      setShowFinishModal(false);
      setMutationError(err.message);
    },
    onOfflineQueued: () => {
      setRoutePoints([]);
      setLocalDriveId(null);
      setLocalStartedAt(null);
      setInitialQuickSpecies([]);
      setShowFinishModal(false);
      setLocalSightingCount(0);
      setLocalSpeciesCount(0);
      void clearLocalDrive();
      void clearPersistedBuffer();
    },
  });

  const driveId = activeDrive.data?.id ?? localDriveId;
  const driveIdRef = useRef(driveId);
  driveIdRef.current = driveId;

  const flushPendingPoints = useCallback(() => {
    const id = driveIdRef.current;
    if (!id || sendingRef.current || pendingPointsRef.current.length === 0) return;
    sendingRef.current = true;
    const batch = pendingPointsRef.current;
    pendingPointsRef.current = [];
    offlineAddRoutePoints
      .mutateAsync({ id, points: batch })
      .finally(() => {
        sendingRef.current = false;
        if (pendingPointsRef.current.length > 0) flushPendingPoints();
      });
  }, [offlineAddRoutePoints]);

  useEffect(() => {
    if (!isNative()) return;
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        flushPendingPoints();
      }
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, [flushPendingPoints]);

  const handleGpsPoints = useCallback(
    (points: GpsPoint[]) => {
      setRoutePoints((prev) => {
        if (points.length === 0) return prev;
        const lastTimestamp = prev[prev.length - 1]?.timestamp ?? "";
        const newPoints = points.filter((p) => p.timestamp > lastTimestamp);
        return newPoints.length > 0 ? [...prev, ...newPoints] : prev;
      });
      void addLocalRoutePoints(points);
      pendingPointsRef.current = [...pendingPointsRef.current, ...points];
      flushPendingPoints();
    },
    [flushPendingPoints],
  );

  const { tracking, autoPaused, error: gpsError, currentPosition, startTracking, stopTracking } =
    useGpsTracker({
      intervalMs: 10000,
      driveId,
      onPoints: handleGpsPoints,
      autoPause: true,
    });

  const autoResumedRef = useRef(false);
  useEffect(() => {
    if (autoResumedRef.current) return;
    if (!driveId) return;
    if (tracking) return;
    autoResumedRef.current = true;
    startTracking();
  }, [driveId, tracking, startTracking]);

  const driveSession = activeDrive.data;
  const elapsed = useDriveElapsed(driveSession?.startedAt ?? localStartedAt);
  const existingRoute = (driveSession?.route ?? []) as unknown as GpsPoint[];
  const allRoutePoints = useMemo(() => {
    if (existingRoute.length === 0) return routePoints;
    if (routePoints.length === 0) return existingRoute;
    const lastServerTime = existingRoute[existingRoute.length - 1]?.timestamp ?? "";
    const newLocalPoints = routePoints.filter((p) => p.timestamp > lastServerTime);
    return [...existingRoute, ...newLocalPoints];
  }, [existingRoute, routePoints]);

  const userProfile = api.user.me.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const distanceUnit = userProfile.data?.distanceUnit ?? "km";

  const totalDistanceM = useMemo(() => {
    const MAX_GAP_MS = 300_000;
    const MAX_SEGMENT_SPEED_KMH = 120;
    let d = 0;
    for (let i = 1; i < allRoutePoints.length; i++) {
      const prev = allRoutePoints[i - 1]!;
      const curr = allRoutePoints[i]!;
      const gap = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (gap <= 0 || gap > MAX_GAP_MS) continue;
      const segDist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      const speedKmh = (segDist / gap) * 3_600_000;
      if (speedKmh > MAX_SEGMENT_SPEED_KMH) continue;
      d += segDist;
    }
    return d;
  }, [allRoutePoints]);

  const sightingMarkers = (driveSession?.sightings ?? []).map((s) => ({
    id: s.id,
    lat: s.latitude,
    lng: s.longitude,
    speciesName: s.species.commonName,
    count: s.count,
    notes: s.notes,
  }));

  const totalSightingCount = Math.max(sightingMarkers.length, localSightingCount);

  if (status === "loading") {
    return <div className="flex flex-1 items-center justify-center text-brand-khaki">Loading...</div>;
  }

  if (!session) {
    redirect("/auth/signin");
  }

  const handleStartFresh = async () => {
    setShowStartModal(false);
    setInitialQuickSpecies([]);
    await startDriveFlow();
  };

  const handleContinueTrip = async () => {
    setShowStartModal(false);
    const trip = await getActiveTrip();
    if (trip) {
      const continued: QuickSpecies[] = trip.species.map((s: TripSpecies) => ({
        speciesId: s.speciesId,
        commonName: s.commonName,
        category: s.category,
        imageUrl: s.imageUrl,
        count: 0,
        lastSightedAt: s.lastSightedAt,
      }));
      setInitialQuickSpecies(continued);
    }
    await startDriveFlow();
  };

  const startDriveFlow = async () => {
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
      void addDriveToTrip(tempId);
      setHasActiveTrip(true);
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
      void addDriveToTrip(created.id);
      setHasActiveTrip(true);
      startTracking();
      void utils.drive.active.invalidate();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to start drive");
    } finally {
      setStarting(false);
    }
  };

  const handleStartDrive = () => {
    if (hasActiveTrip) {
      setShowStartModal(true);
    } else {
      void handleStartFresh();
    }
  };

  const handleEndDrive = () => {
    stopTracking();
    setShowFinishModal(true);
  };

  const handleSaveDrive = () => {
    setShowFinishModal(false);
    const id = driveSession?.id ?? localDriveId;
    if (id) {
      savedDriveIdRef.current = id;
      offlineEndDrive.mutate({ id });
    }
  };

  const handleDiscardDrive = () => {
    setShowFinishModal(false);
    const id = driveSession?.id ?? localDriveId;
    if (id) {
      discardDriveMutation.mutate(
        { id },
        {
          onSuccess: () => {
            setRoutePoints([]);
            setMutationError(null);
            setLocalDriveId(null);
            setLocalStartedAt(null);
            setInitialQuickSpecies([]);
            void clearLocalDrive();
            void clearPersistedBuffer();
            void utils.drive.active.invalidate();
            void utils.drive.list.invalidate();
          },
          onError: () => {
            setRoutePoints([]);
            setLocalDriveId(null);
            setLocalStartedAt(null);
            setInitialQuickSpecies([]);
            void clearLocalDrive();
            void clearPersistedBuffer();
          },
        },
      );
    } else {
      setRoutePoints([]);
      setLocalDriveId(null);
      setLocalStartedAt(null);
      setInitialQuickSpecies([]);
      void clearLocalDrive();
      void clearPersistedBuffer();
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
        pois={poiMarkers}
        currentPosition={currentPosition}
        className="h-full w-full"
        compactControls
        showRoads
        mapRef={mapRef}
        bottomPadding={200}
        onPoiCreate={(poi) => createPoiMutation.mutate(poi)}
      />

      <Link
        href="/?home"
        className="absolute left-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg transition active:scale-95"
        style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <svg className="h-5 w-5 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Link>

      <div className="absolute bottom-0 left-1/2 z-[1000] w-full max-w-lg -translate-x-1/2 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {isActive && !starting && (driveSession?.id ?? localDriveId) && (
          <div className="mb-2">
            {!panelExpanded && (
              <button
                onClick={() => setPanelExpanded(true)}
                className="flex w-full items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/20">
                  <svg className="h-5 w-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm font-semibold text-brand-dark">
                  {localSpeciesCount} species · {totalSightingCount} sightings
                </span>
                <svg className="h-5 w-5 text-brand-khaki" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
            <div className={panelExpanded ? "" : "hidden"}>
              <QuickSightingPanel
                driveSessionId={(driveSession?.id ?? localDriveId)!}
                currentPosition={currentPosition}
                initialSpecies={initialQuickSpecies}
                onSightingLogged={(count, speciesCount) => {
                  setLocalSightingCount(count);
                  setLocalSpeciesCount(speciesCount);
                  void utils.drive.active.invalidate();
                }}
                onCollapse={() => setPanelExpanded(false)}
              />
            </div>
          </div>
        )}

        <div>
          {!isActive ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-lg font-bold text-brand-dark">Game Drive</h2>
                <p className="mt-1 text-sm text-brand-khaki">
                  Track your route and log wildlife sightings
                </p>
              </div>
              <div className="flex items-center gap-4">
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
                {hasActiveTrip && (
                  <button
                    onClick={() => setShowTripSummary(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/20 transition active:scale-95"
                  >
                    <svg className="h-6 w-6 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                )}
              </div>
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
            <>
              <div className="rounded-2xl bg-white/95 px-3 py-3 shadow-xl backdrop-blur-sm">
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-3xl font-bold tabular-nums text-brand-dark">
                        {formatDuration(elapsed)}
                      </div>
                      <button
                        onClick={() => {
                          if (!mapRef.current || allRoutePoints.length === 0) return;
                          if (routeOverview) {
                            setRouteOverview(false);
                            if (currentPosition) {
                              mapRef.current.setView([currentPosition.lat, currentPosition.lng], 15);
                            }
                          } else {
                            setRouteOverview(true);
                            const bounds = allRoutePoints.map((p) => [p.lat, p.lng] as [number, number]);
                            mapRef.current.fitBounds(bounds, { padding: [40, 40], paddingBottomRight: [40, 240] });
                          }
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-95 ${routeOverview ? "bg-brand-brown text-white" : "bg-brand-cream text-brand-khaki"}`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs font-medium text-brand-khaki">
                      {autoPaused ? "Auto-paused" : tracking ? "Recording" : "Paused"}
                    </div>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <div className="text-lg font-bold text-brand-dark">{totalSightingCount}</div>
                      <div className="text-xs text-brand-khaki">Sightings</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-brand-dark">{formatDistance(totalDistanceM, distanceUnit)}</div>
                      <div className="text-xs text-brand-khaki">Distance</div>
                    </div>
                  </div>
                </div>
                {tracking ? (
                  <button
                    onClick={stopTracking}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gold py-2.5 shadow-md transition active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    <span className="text-sm font-bold text-white">Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={startTracking}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-2.5 shadow-md transition active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="text-sm font-bold text-white">Resume</span>
                  </button>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setShowTripSummary(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-gold/15 py-2.5 transition active:scale-95"
                  >
                    <svg className="h-4 w-4 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-xs font-semibold text-brand-gold">Trip</span>
                  </button>
                  <button
                    onClick={() => setShowCamera(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 py-2.5 transition active:scale-95"
                  >
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-blue-600">Photo</span>
                  </button>
                  <button
                    onClick={handleEndDrive}
                    disabled={offlineEndDrive.isPending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600/10 py-2.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                    <span className="text-xs font-semibold text-red-600">
                      {offlineEndDrive.isPending ? "Ending..." : "Finish"}
                    </span>
                  </button>
                </div>
              </div>

            </>
          )}
        </div>
      </div>

      {showStartModal && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-brand-dark">Start New Drive</h3>
            <p className="mt-2 text-sm text-brand-khaki">
              You have an active trip. Would you like to continue it or start fresh?
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => void handleContinueTrip()}
                className="w-full rounded-xl bg-brand-green py-3 text-sm font-bold text-white transition active:scale-95"
              >
                Continue Trip
              </button>
              <button
                onClick={() => void handleStartFresh()}
                className="w-full rounded-xl bg-brand-cream py-3 text-sm font-bold text-brand-dark transition active:scale-95"
              >
                Start Fresh
              </button>
              <button
                onClick={() => setShowStartModal(false)}
                className="text-sm text-brand-khaki"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinishModal && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-brand-dark">Finish Drive</h3>
            <p className="mt-2 text-sm text-brand-khaki">
              Would you like to save this activity or discard it?
            </p>
            <div className="mt-2 rounded-lg bg-brand-cream/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-khaki">Duration</span>
                <span className="font-mono font-semibold text-brand-dark">{formatDuration(elapsed)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-brand-khaki">Distance</span>
                <span className="font-semibold text-brand-dark">{formatDistance(totalDistanceM, distanceUnit)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-brand-khaki">Sightings</span>
                <span className="font-semibold text-brand-dark">{totalSightingCount}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-brand-khaki">Route points</span>
                <span className="font-semibold text-brand-dark">{allRoutePoints.length}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleSaveDrive}
                disabled={offlineEndDrive.isPending}
                className="w-full rounded-xl bg-brand-green py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                {offlineEndDrive.isPending ? "Saving..." : "Save Activity"}
              </button>
              <button
                onClick={handleDiscardDrive}
                disabled={discardDriveMutation.isPending}
                className="w-full rounded-xl bg-red-600/10 py-3 text-sm font-bold text-red-600 transition active:scale-95 disabled:opacity-50"
              >
                {discardDriveMutation.isPending ? "Discarding..." : "Discard"}
              </button>
              <button
                onClick={() => {
                  setShowFinishModal(false);
                  startTracking();
                }}
                className="text-sm text-brand-khaki"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (driveSession?.id ?? localDriveId) && (
        <PhotoCapture
          driveId={(driveSession?.id ?? localDriveId)!}
          currentPosition={currentPosition}
          speciesList={(allSpecies.data ?? []).map((s) => ({
            id: s.id,
            commonName: s.commonName,
            category: s.category,
            imageUrl: s.imageUrl,
          }))}
          onSightingsConfirmed={(sightings, _photoUrl, metadata) => {
            setShowCamera(false);
            const pos = {
              lat: metadata?.lat ?? currentPosition?.lat ?? -24.25,
              lng: metadata?.lng ?? currentPosition?.lng ?? 31.15,
            };
            const createdAt = metadata?.date?.toISOString();
            let addedSightings = 0;
            const seenSpeciesIds = new Set(initialQuickSpecies.map((s) => s.speciesId));
            for (const s of sightings) {
              offlineCreateSighting.mutate({
                driveSessionId: (driveSession?.id ?? localDriveId)!,
                speciesId: s.speciesId,
                latitude: pos.lat,
                longitude: pos.lng,
                count: s.count,
                ...(createdAt ? { createdAt } : {}),
              });
              void addLocalSighting({
                id: generateTempId(),
                speciesId: s.speciesId,
                latitude: pos.lat,
                longitude: pos.lng,
                count: s.count,
              });
              void updateTripSpecies(s.speciesId, s.commonName, s.category, s.imageUrl, s.count);
              addedSightings += s.count;
              seenSpeciesIds.add(s.speciesId);
            }
            setLocalSightingCount((prev) => prev + addedSightings);
            setLocalSpeciesCount(seenSpeciesIds.size);
            void utils.drive.active.invalidate();
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showTripSummary && (
        <div className="absolute inset-0 z-[2000] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 mb-[calc(2rem+env(safe-area-inset-bottom))] w-full max-w-lg">
            <TripSummary onClose={() => {
              setShowTripSummary(false);
              void getActiveTrip().then((trip) => setHasActiveTrip(!!trip));
            }} />
          </div>
        </div>
      )}
    </main>
  );
}
