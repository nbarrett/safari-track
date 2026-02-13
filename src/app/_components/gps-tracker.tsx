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
}

const GPS_BUFFER_KEY = "gps-route-buffer";
const gpsStore = typeof window !== "undefined"
  ? createStore("klaserie-gps", "buffer")
  : undefined;

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

export function useGpsTracker({ intervalMs = 5000, driveId, onPoints }: GpsTrackerOptions) {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GpsPoint | null>(null);
  const bufferRef = useRef<GpsPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!driveId) return;
    void getPersistedBuffer().then((persisted) => {
      if (persisted.length > 0) {
        onPoints(persisted);
      }
    });
  }, [driveId, onPoints]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setError(null);
    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point: GpsPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };
        setCurrentPosition(point);
        bufferRef.current = [...bufferRef.current, point];
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      },
    );

    flushIntervalRef.current = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const points = bufferRef.current;
        onPoints(points);
        void persistBuffer(points);
        bufferRef.current = [];
      }
    }, intervalMs);
  }, [intervalMs, onPoints]);

  const stopTracking = useCallback(() => {
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
      onPoints(points);
      void persistBuffer(points);
      bufferRef.current = [];
    }

    setTracking(false);
  }, [onPoints]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
  }, []);

  return { tracking, error, currentPosition, startTracking, stopTracking };
}
