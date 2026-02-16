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
  compactControls?: boolean;
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

const POSITION_ICON = L.divIcon({
  className: "position-marker",
  html: `<div style="position:relative;width:28px;height:28px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.15);animation:position-pulse 2s ease-out infinite"></div><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
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
  compactControls = false,
}: MapProps) {
  const internalMapRef = useRef<L.Map | null>(null);
  const mapRefToUse = externalMapRef ?? internalMapRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const polylineGroupRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const photoMarkersRef = useRef<L.Marker[]>([]);
  const positionMarkerRef = useRef<L.Marker | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const roadsLayerRef = useRef<L.GeoJSON | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [roadsVisible, setRoadsVisible] = useState(showRoadsDefault);
  const [satelliteActive, setSatelliteActive] = useState(false);
  const roadsVisibleRef = useRef(roadsVisible);
  roadsVisibleRef.current = roadsVisible;
  const followUserRef = useRef(compactControls);
  const routeInitialisedRef = useRef(false);
  const [heading, setHeading] = useState(0);
  const headingRef = useRef(0);
  const [compassReceiving, setCompassReceiving] = useState(false);
  const compassReceivingRef = useRef(false);
  const cleanupCompassRef = useRef<(() => void) | null>(null);

  const attachCompassListeners = () => {
    if (cleanupCompassRef.current) cleanupCompassRef.current();

    const handler = (event: DeviceOrientationEvent) => {
      const ios = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      let deg: number | null = null;
      if (ios != null && ios >= 0) {
        deg = ios;
      } else if (event.alpha != null) {
        deg = event.absolute ? (360 - event.alpha) % 360 : event.alpha;
      }
      if (deg == null) return;
      if (!compassReceivingRef.current) {
        compassReceivingRef.current = true;
        setCompassReceiving(true);
      }
      const rounded = Math.round(deg);
      if (rounded !== headingRef.current) {
        headingRef.current = rounded;
        setHeading(rounded);
      }
    };

    window.addEventListener("deviceorientationabsolute" as string, handler as EventListener);
    window.addEventListener("deviceorientation", handler);

    const cleanup = () => {
      window.removeEventListener("deviceorientationabsolute" as string, handler as EventListener);
      window.removeEventListener("deviceorientation", handler);
      cleanupCompassRef.current = null;
    };
    cleanupCompassRef.current = cleanup;
    return cleanup;
  };

  useEffect(() => {
    if (!compactControls) return;

    const needsPermission =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function";

    if (!needsPermission) {
      const cleanup = attachCompassListeners();
      return cleanup;
    }
  }, [compactControls]);

  useEffect(() => {
    if (!compactControls) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && compassReceivingRef.current) {
        attachCompassListeners();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [compactControls]);

  const requestCompassPermission = async () => {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DOE.requestPermission) {
      try {
        const result = await DOE.requestPermission();
        if (result === "granted") {
          attachCompassListeners();
        }
      } catch {
        attachCompassListeners();
      }
    } else if (!compassReceivingRef.current) {
      attachCompassListeners();
    }
  };

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
        if (roadsVisibleRef.current) {
          layer.addTo(map);
        }
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

    if (compactControls) {
      map.on("dragstart", () => {
        followUserRef.current = false;
      });
    }

    mapRefToUse.current = map;

    const container = containerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
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

    if (polylineGroupRef.current) {
      polylineGroupRef.current.clearLayers();
    } else {
      polylineGroupRef.current = L.layerGroup().addTo(mapRefToUse.current);
    }

    if (route.length > 0) {
      const MAX_GAP_MS = 30_000;
      const segments: [number, number][][] = [];
      let currentSegment: [number, number][] = [];

      for (let i = 0; i < route.length; i++) {
        const point = route[i]!;
        if (i > 0) {
          const prev = route[i - 1]!;
          const gap = new Date(point.timestamp).getTime() - new Date(prev.timestamp).getTime();
          if (gap > MAX_GAP_MS) {
            if (currentSegment.length > 1) {
              segments.push(currentSegment);
            }
            currentSegment = [];
          }
        }
        currentSegment.push([point.lat, point.lng]);
      }
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }

      let bounds: L.LatLngBounds | null = null;
      for (const seg of segments) {
        const pl = L.polyline(seg, { color: "#3b82f6", weight: 4, opacity: 0.8 });
        polylineGroupRef.current.addLayer(pl);
        bounds = bounds ? bounds.extend(pl.getBounds()) : pl.getBounds();
      }

      if (compactControls) {
        if (!routeInitialisedRef.current) {
          routeInitialisedRef.current = true;
        }
      } else if (bounds) {
        mapRefToUse.current.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [route, compactControls]);

  useEffect(() => {
    if (!mapRefToUse.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    sightings.forEach((s) => {
      const marker = L.marker([s.lat, s.lng], { icon: SIGHTING_ICON })
        .addTo(mapRefToUse.current!)
        .bindPopup(
          `<strong>${s.speciesName}</strong><br/>Count: ${s.count}${s.notes ? `<br/>${s.notes}` : ""}`,
          { autoPan: false },
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

  useEffect(() => {
    if (!mapRefToUse.current) return;

    if (!currentPosition) {
      if (positionMarkerRef.current) {
        positionMarkerRef.current.remove();
        positionMarkerRef.current = null;
      }
      return;
    }

    if (positionMarkerRef.current) {
      positionMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
    } else {
      positionMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
        icon: POSITION_ICON,
        zIndexOffset: 1000,
      }).addTo(mapRefToUse.current);
    }

    if (compactControls && followUserRef.current) {
      mapRefToUse.current.setView(
        [currentPosition.lat, currentPosition.lng],
        mapRefToUse.current.getZoom(),
      );
    }
  }, [currentPosition, compactControls]);

  const handleLocate = () => {
    if (!mapRefToUse.current || !currentPosition) return;
    followUserRef.current = true;
    mapRefToUse.current.setView([currentPosition.lat, currentPosition.lng], 16);
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={className} />
      {compactControls ? (
        <div className="absolute right-3 z-[1000] flex flex-col gap-2" style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
          <button
            onClick={() => void requestCompassPermission()}
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${compassReceiving ? "bg-white" : "bg-white/70 ring-2 ring-brand-gold animate-pulse"}`}
          >
            <svg className="h-9 w-9 transition-transform duration-200" viewBox="0 0 40 40" fill="none" style={{ transform: `rotate(${-heading}deg)` }}>
              <polygon points="20,4 17.5,9 22.5,9" fill={compassReceiving ? "#1f2937" : "#d97706"} />
              <polygon points="20,36 22.5,31 17.5,31" fill="#ef4444" />
              <line x1="35" y1="20" x2="32" y2="20" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="5" y1="20" x2="8" y2="20" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="31" y1="9" x2="28.5" y2="11.5" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="9" y1="9" x2="11.5" y2="11.5" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="31" y1="31" x2="28.5" y2="28.5" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="9" y1="31" x2="11.5" y2="28.5" stroke="#d1d5db" strokeWidth="1.2" strokeLinecap="round" />
              <text x="20" y="24" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="system-ui,-apple-system,sans-serif" fill="#1f2937">N</text>
            </svg>
          </button>
          <button
            onClick={() => setSatelliteActive(!satelliteActive)}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${satelliteActive ? "bg-brand-brown text-white" : "bg-white/90 text-brand-dark"}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </button>
          <button
            onClick={() => setRoadsVisible(!roadsVisible)}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${roadsVisible ? "bg-brand-brown text-white" : "bg-white/90 text-brand-dark"}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
          </button>
          <button
            onClick={handleLocate}
            disabled={!currentPosition}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${currentPosition ? "bg-white/90" : "bg-white/50"}`}
          >
            <svg className={`h-5 w-5 ${currentPosition ? "text-brand-dark" : "text-brand-khaki/50"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
            </svg>
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
