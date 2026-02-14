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
  showRoads?: boolean;
  currentPosition?: { lat: number; lng: number } | null;
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
  showRoads: showRoadsDefault = false,
  currentPosition,
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
  const roadsLayerRef = useRef<L.GeoJSON | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [roadsVisible, setRoadsVisible] = useState(showRoadsDefault);
  const [satelliteActive, setSatelliteActive] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRefToUse.current) return;

    const map = L.map(containerRef.current, { zoomControl: false }).setView(center, zoom);

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
    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteLayer;

    map.createPane("roads");
    map.getPane("roads")!.style.zIndex = "350";

    fetch("/data/roads.geojson")
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => {
        const layer = L.geoJSON(data, {
          pane: "roads",
          style: (feature) => {
            const hw = feature?.properties?.highway as string;
            if (hw === "path") {
              return { color: "#92400e", weight: 1.5, opacity: 0.5, dashArray: "6 4" };
            }
            if (hw === "service" || hw === "residential") {
              return { color: "#78716c", weight: 1.5, opacity: 0.6 };
            }
            return { color: "#d97706", weight: 2, opacity: 0.7 };
          },
          onEachFeature: (_feature, layer) => {
            const props = _feature.properties ?? {};
            const parts: string[] = [];
            if (props.name) parts.push(`<strong>${props.name as string}</strong>`);
            if (props.surface) parts.push(`Surface: ${props.surface as string}`);
            if (parts.length > 0) {
              layer.bindPopup(parts.join("<br/>"));
            }
          },
        });
        roadsLayerRef.current = layer;
      })
      .catch(() => {});

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
    if (!mapRefToUse.current || !roadsLayerRef.current) return;
    if (roadsVisible) {
      roadsLayerRef.current.addTo(mapRefToUse.current);
    } else {
      roadsLayerRef.current.remove();
    }
  }, [roadsVisible]);

  useEffect(() => {
    if (!mapRefToUse.current || !osmLayerRef.current || !satelliteLayerRef.current) return;
    if (satelliteActive) {
      osmLayerRef.current.remove();
      satelliteLayerRef.current.addTo(mapRefToUse.current);
    } else {
      satelliteLayerRef.current.remove();
      osmLayerRef.current.addTo(mapRefToUse.current);
    }
  }, [satelliteActive]);

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

  const handleLocate = () => {
    if (!mapRefToUse.current || !currentPosition) return;
    mapRefToUse.current.setView([currentPosition.lat, currentPosition.lng], 16);
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={className} />
      <div className="absolute right-2 top-2 z-[1000] flex flex-col gap-1.5">
        <button
          onClick={() => setSatelliteActive(!satelliteActive)}
          className="rounded bg-white px-2 py-1 text-xs font-medium shadow-md"
        >
          {satelliteActive ? "Street" : "Satellite"}
        </button>
        {showOverlay && (
          <button
            onClick={() => setOverlayVisible(!overlayVisible)}
            className="rounded bg-white px-2 py-1 text-xs font-medium shadow-md"
          >
            {overlayVisible ? "Hide Reserve" : "Reserve Map"}
          </button>
        )}
        <button
          onClick={() => setRoadsVisible(!roadsVisible)}
          className="rounded bg-white px-2 py-1 text-xs font-medium shadow-md"
        >
          {roadsVisible ? "Hide Roads" : "Roads"}
        </button>
        {currentPosition && (
          <button
            onClick={handleLocate}
            className="flex items-center justify-center rounded bg-white p-1.5 shadow-md"
          >
            <svg className="h-4 w-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
