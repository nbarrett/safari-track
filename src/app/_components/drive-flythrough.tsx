"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import { haversineDistance } from "~/lib/drive-stats";
import { OfflineImage } from "~/app/_components/offline-image";

const DriveMap = dynamic(
  () => import("~/app/_components/map").then((mod) => mod.DriveMap),
  { ssr: false },
);

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface PhotoMarker {
  url: string;
  lat: number;
  lng: number;
  caption?: string | null;
}

interface SightingMarker {
  id: string;
  lat: number;
  lng: number;
  speciesName: string;
  count: number;
  notes?: string | null;
  imageUrl?: string | null;
}

interface FlythroughProps {
  route: GpsPoint[];
  photos: PhotoMarker[];
  sightings: SightingMarker[];
  onClose: () => void;
}

const SPEEDS = [1, 2, 4];
const PHOTO_DISPLAY_MS = 3500;
const PROXIMITY_METERS = 50;

export function DriveFlythrough({ route, photos, sightings, onClose }: FlythroughProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activePhoto, setActivePhoto] = useState<PhotoMarker | null>(null);
  const [activeSighting, setActiveSighting] = useState<SightingMarker | null>(null);
  const progressRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const animFrameRef = useRef<number>(0);
  const trailPolylineRef = useRef<L.Polyline | null>(null);
  const positionMarkerRef = useRef<L.CircleMarker | null>(null);
  const shownPhotosRef = useRef<Set<string>>(new Set());
  const shownSightingsRef = useRef<Set<string>>(new Set());
  const pausedForOverlayRef = useRef(false);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    speedRef.current = SPEEDS[speedIndex]!;
  }, [speedIndex]);

  const getPointAtProgress = useCallback(
    (p: number): [number, number] => {
      const idx = Math.min(Math.floor(p * (route.length - 1)), route.length - 2);
      const frac = p * (route.length - 1) - idx;
      const a = route[idx]!;
      const b = route[Math.min(idx + 1, route.length - 1)]!;
      return [a.lat + (b.lat - a.lat) * frac, a.lng + (b.lng - a.lng) * frac];
    },
    [route],
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (!playingRef.current || !mapRef.current || route.length < 2) return;

      if (pausedForOverlayRef.current) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const baseStepPerMs = 1 / (route.length * 50);
      const step = baseStepPerMs * speedRef.current * delta;
      const newProgress = Math.min(progressRef.current + step, 1);
      progressRef.current = newProgress;
      setProgress(newProgress);

      const [lat, lng] = getPointAtProgress(newProgress);
      mapRef.current.panTo([lat, lng], { animate: true, duration: 0.1 });

      if (positionMarkerRef.current) {
        positionMarkerRef.current.setLatLng([lat, lng]);
      } else {
        positionMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          color: "#f59e0b",
          fillColor: "#f59e0b",
          fillOpacity: 1,
          weight: 2,
        }).addTo(mapRef.current);
      }

      const trailIdx = Math.floor(newProgress * (route.length - 1));
      const trailPoints = route.slice(0, trailIdx + 1).map((p) => [p.lat, p.lng] as [number, number]);
      trailPoints.push([lat, lng]);
      if (trailPolylineRef.current) {
        trailPolylineRef.current.setLatLngs(trailPoints);
      } else {
        trailPolylineRef.current = L.polyline(trailPoints, {
          color: "#f59e0b",
          weight: 4,
          opacity: 0.9,
        }).addTo(mapRef.current);
      }

      for (const photo of photos) {
        if (photo.lat == null || photo.lng == null) continue;
        const key = `${photo.lat},${photo.lng}`;
        if (shownPhotosRef.current.has(key)) continue;
        const dist = haversineDistance(lat, lng, photo.lat, photo.lng);
        if (dist < PROXIMITY_METERS) {
          shownPhotosRef.current.add(key);
          setActivePhoto(photo);
          pausedForOverlayRef.current = true;
          setTimeout(() => {
            setActivePhoto(null);
            pausedForOverlayRef.current = false;
          }, PHOTO_DISPLAY_MS);
          break;
        }
      }

      for (const sighting of sightings) {
        if (shownSightingsRef.current.has(sighting.id)) continue;
        const dist = haversineDistance(lat, lng, sighting.lat, sighting.lng);
        if (dist < PROXIMITY_METERS) {
          shownSightingsRef.current.add(sighting.id);
          setActiveSighting(sighting);
          pausedForOverlayRef.current = true;
          setTimeout(() => {
            setActiveSighting(null);
            pausedForOverlayRef.current = false;
          }, PHOTO_DISPLAY_MS);
          break;
        }
      }

      if (newProgress >= 1) {
        setPlaying(false);
        return;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [route, photos, sightings, getPointAtProgress],
  );

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = 0;
      animFrameRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playing, animate]);

  useEffect(() => {
    if (mapRef.current && route.length > 0) {
      mapRef.current.setView([route[0]!.lat, route[0]!.lng], 16);
    }
  }, [route]);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    progressRef.current = val;
    setProgress(val);
    if (mapRef.current && route.length > 1) {
      const [lat, lng] = getPointAtProgress(val);
      mapRef.current.panTo([lat, lng], { animate: false });
      if (positionMarkerRef.current) positionMarkerRef.current.setLatLng([lat, lng]);
    }
  };

  const handlePlayPause = () => {
    if (progress >= 1) {
      progressRef.current = 0;
      setProgress(0);
      shownPhotosRef.current.clear();
      shownSightingsRef.current.clear();
      if (trailPolylineRef.current) {
        trailPolylineRef.current.setLatLngs([]);
      }
    }
    setPlaying(!playing);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex-1 relative">
        <DriveMap
          route={route}
          sightings={sightings}
          photos={photos}
          zoom={16}
          className="h-full w-full"
          mapRef={mapRef}
        />

        {activePhoto && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[80vh] max-w-[90vw] overflow-hidden rounded-xl">
              <img
                src={activePhoto.url}
                alt={activePhoto.caption ?? "Drive photo"}
                className="max-h-[70vh] w-auto rounded-xl object-contain"
              />
              {activePhoto.caption && (
                <div className="mt-2 text-center text-sm text-white">{activePhoto.caption}</div>
              )}
            </div>
          </div>
        )}

        {activeSighting && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
            <div className="max-w-[80vw] overflow-hidden rounded-xl bg-white shadow-2xl">
              {activeSighting.imageUrl && (
                <div className="relative h-52 w-72 overflow-hidden">
                  <OfflineImage
                    src={activeSighting.imageUrl}
                    alt={activeSighting.speciesName}
                    className="h-52 w-72 object-cover"
                    placeholderClassName="h-52 w-72"
                  />
                </div>
              )}
              <div className="px-5 py-3 text-center">
                <div className="text-xl font-bold text-brand-dark">{activeSighting.speciesName}</div>
                <div className="mt-0.5 text-sm text-brand-khaki">
                  Count: {activeSighting.count}
                  {activeSighting.notes && <> &middot; {activeSighting.notes}</>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 bg-brand-dark/95 px-4 py-3 backdrop-blur">
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
        >
          ✕
        </button>

        <button
          onClick={handlePlayPause}
          className="rounded-lg bg-brand-gold px-4 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-gold/80"
        >
          {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
        </button>

        <button
          onClick={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
        >
          {SPEEDS[speedIndex]}x
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={handleScrub}
          className="flex-1"
        />

        <span className="text-xs text-white/60">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}
