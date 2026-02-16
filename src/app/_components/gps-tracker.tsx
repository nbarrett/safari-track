"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { get, set, createStore } from "idb-keyval";

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface GpsTrackerOptions {
  intervalMs?: number;
  driveId?: string | null;
  onPoints: (points: GpsPoint[]) => void;
  autoPause?: boolean;
}

const GPS_BUFFER_KEY = "gps-route-buffer";
const gpsStore = typeof window !== "undefined"
  ? createStore("safari-track-gps", "buffer")
  : undefined;

const MAX_ACCURACY_M = 30;
const MIN_DISTANCE_M = 5;
const MAX_SPEED_MS = 33;
const AUTO_PAUSE_AFTER_MS = 15_000;
const AUTO_RESUME_DISTANCE_M = 10;

function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeBearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

async function persistBuffer(points: GpsPoint[]) {
  if (!gpsStore) return;
  const existing = (await get<GpsPoint[]>(GPS_BUFFER_KEY, gpsStore)) ?? [];
  await set(GPS_BUFFER_KEY, [...existing, ...points], gpsStore);
}

export async function getPersistedBuffer(): Promise<GpsPoint[]> {
  if (!gpsStore) return [];
  return (await get<GpsPoint[]>(GPS_BUFFER_KEY, gpsStore)) ?? [];
}

export async function clearPersistedBuffer() {
  if (!gpsStore) return;
  await set(GPS_BUFFER_KEY, [], gpsStore);
}

export function useGpsTracker({ intervalMs = 5000, driveId, onPoints, autoPause = false }: GpsTrackerOptions) {
  const [tracking, setTracking] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GpsPoint & { bearing?: number } | null>(null);
  const bufferRef = useRef<GpsPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onPointsRef = useRef(onPoints);
  onPointsRef.current = onPoints;

  const lastAcceptedRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const lastMovementRef = useRef<number>(Date.now());
  const autoPauseRef = useRef(autoPause);
  autoPauseRef.current = autoPause;

  useEffect(() => {
    if (!driveId) return;
    void getPersistedBuffer().then((persisted) => {
      if (persisted.length > 0) {
        onPointsRef.current(persisted);
        void clearPersistedBuffer();
      }
    });
  }, [driveId]);

  const trackingRef = useRef(false);

  const beginWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();

        const prevAccepted = lastAcceptedRef.current;
        const bearing = prevAccepted ? computeBearing(prevAccepted.lat, prevAccepted.lng, latitude, longitude) : undefined;
        setCurrentPosition({
          lat: latitude,
          lng: longitude,
          timestamp: new Date(now).toISOString(),
          bearing,
        });

        if (accuracy > MAX_ACCURACY_M) return;

        const last = lastAcceptedRef.current;
        if (last) {
          const dist = haversineMetres(last.lat, last.lng, latitude, longitude);

          if (autoPauseRef.current) {
            if (dist >= AUTO_RESUME_DISTANCE_M) {
              lastMovementRef.current = now;
              setAutoPaused(false);
            } else if (now - lastMovementRef.current > AUTO_PAUSE_AFTER_MS) {
              setAutoPaused(true);
              return;
            }
          }

          if (dist < MIN_DISTANCE_M) return;

          const dt = (now - last.time) / 1000;
          if (dt > 0 && dist / dt > MAX_SPEED_MS) return;
        } else {
          lastMovementRef.current = now;
        }

        const point: GpsPoint = {
          lat: latitude,
          lng: longitude,
          timestamp: new Date(now).toISOString(),
        };
        lastAcceptedRef.current = { lat: latitude, lng: longitude, time: now };
        bufferRef.current = [...bufferRef.current, point];
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setError("Location permission denied");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );

    flushIntervalRef.current = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const points = bufferRef.current;
        onPointsRef.current(points);
        void persistBuffer(points);
        bufferRef.current = [];
      }
    }, intervalMs);
  }, [intervalMs]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setError(null);
    setTracking(true);
    trackingRef.current = true;
    setAutoPaused(false);
    lastAcceptedRef.current = null;
    lastMovementRef.current = Date.now();

    beginWatch();
  }, [beginWatch]);

  const stopTracking = useCallback(() => {
    trackingRef.current = false;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    if (bufferRef.current.length > 0) {
      const points = bufferRef.current;
      onPointsRef.current(points);
      void persistBuffer(points);
      bufferRef.current = [];
    }

    setTracking(false);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && trackingRef.current) {
        lastAcceptedRef.current = null;
        beginWatch();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
  }, [beginWatch]);

  return { tracking, autoPaused, error, currentPosition, startTracking, stopTracking };
}
