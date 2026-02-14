"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  route?: GpsPoint[];
  sightings?: SightingMarker[];
  photos?: PhotoMarker[];
  onMapClick?: (lat: number, lng: number) => void;
  showOverlay?: boolean;
  className?: string;
  mapRef?: React.MutableRefObject<L.Map | null>;
}

const PHOTO_ICON = L.divIcon({
  className: "photo-marker",
  html: `<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z" fill="none" stroke="white" stroke-width="2"/></svg></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const SIGHTING_ICON = L.divIcon({
  className: "sighting-marker",
  html: `<div style="background:#ef4444;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const DUNDEE_OVERLAY_BOUNDS: L.LatLngBoundsExpression = [
  [-24.35, 31.05],
  [-24.15, 31.25],
];

export function DriveMap({
  center = [-24.25, 31.15],
  zoom = 14,
  route = [],
  sightings = [],
  photos = [],
  onMapClick,
  showOverlay = false,
  className = "h-full w-full",
  mapRef: externalMapRef,
}: MapProps) {
  const internalMapRef = useRef<L.Map | null>(null);
  const mapRefToUse = externalMapRef ?? internalMapRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const photoMarkersRef = useRef<L.Marker[]>([]);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRefToUse.current) return;

    const map = L.map(containerRef.current).setView(center, zoom);

    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    });

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "&copy; Esri",
        maxZoom: 19,
      },
    );

    osmLayer.addTo(map);

    L.control
      .layers(
        { Street: osmLayer, Satellite: satelliteLayer },
        {},
        { position: "topright" },
      )
      .addTo(map);

    if (showOverlay) {
      overlayRef.current = L.imageOverlay(
        "/dundee-map-0.png",
        DUNDEE_OVERLAY_BOUNDS,
        { opacity: 0, interactive: false },
      ).addTo(map);
    }

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRefToUse.current = map;

    return () => {
      map.remove();
      mapRefToUse.current = null;
    };
  }, []);

  useEffect(() => {
    if (!overlayRef.current) return;
    overlayRef.current.setOpacity(overlayVisible ? 0.7 : 0);
  }, [overlayVisible]);

  useEffect(() => {
    if (!mapRefToUse.current) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    if (route.length > 0) {
      const latlngs = route.map((p) => [p.lat, p.lng] as [number, number]);
      polylineRef.current = L.polyline(latlngs, {
        color: "#3b82f6",
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRefToUse.current);

      mapRefToUse.current.fitBounds(polylineRef.current.getBounds(), { padding: [20, 20] });
    }
  }, [route]);

  useEffect(() => {
    if (!mapRefToUse.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    sightings.forEach((s) => {
      const marker = L.marker([s.lat, s.lng], { icon: SIGHTING_ICON })
        .addTo(mapRefToUse.current!)
        .bindPopup(
          `<strong>${s.speciesName}</strong><br/>Count: ${s.count}${s.notes ? `<br/>${s.notes}` : ""}`,
        );
      markersRef.current.push(marker);
    });
  }, [sightings]);

  useEffect(() => {
    if (!mapRefToUse.current) return;

    photoMarkersRef.current.forEach((m) => m.remove());
    photoMarkersRef.current = [];

    photos
      .filter((p) => p.lat != null && p.lng != null)
      .forEach((p) => {
        const marker = L.marker([p.lat, p.lng], { icon: PHOTO_ICON })
          .addTo(mapRefToUse.current!)
          .bindPopup(
            `<div style="min-width:200px"><img src="${p.url}" style="width:100%;border-radius:4px" />${p.caption ? `<div style="margin-top:4px;font-size:12px">${p.caption}</div>` : ""}</div>`,
            { maxWidth: 300 },
          );
        photoMarkersRef.current.push(marker);
      });
  }, [photos]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={className} />
      {showOverlay && (
        <button
          onClick={() => setOverlayVisible(!overlayVisible)}
          className="absolute right-2 top-20 z-[1000] rounded bg-white px-2 py-1 text-xs font-medium shadow-md"
        >
          {overlayVisible ? "Hide Reserve Map" : "Show Reserve Map"}
        </button>
      )}
    </div>
  );
}
