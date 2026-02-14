"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { useOfflineMutation } from "~/lib/use-offline-mutation";
import { updateTripSpecies } from "~/lib/trip-store";
import { addLocalSighting } from "~/lib/drive-store";
import { generateTempId } from "~/lib/offline-queue";

interface QuickSpecies {
  speciesId: string;
  commonName: string;
  category: string;
  imageUrl: string | null;
  count: number;
  lastSightedAt: number;
}

interface QuickSightingPanelProps {
  driveSessionId: string;
  currentPosition: { lat: number; lng: number } | null;
  initialSpecies?: QuickSpecies[];
  onSightingLogged?: () => void;
}

function triggerHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(30);
  }
}

export function QuickSightingPanel({
  driveSessionId,
  currentPosition,
  initialSpecies,
  onSightingLogged,
}: QuickSightingPanelProps) {
  const [quickSpecies, setQuickSpecies] = useState<QuickSpecies[]>(initialSpecies ?? []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [longPressTarget, setLongPressTarget] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speciesSearch = api.species.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 1 },
  );

  const speciesList = api.species.list.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });

  const createSightingMutation = api.sighting.create.useMutation();
  const markChecklistMutation = api.checklist.markFromSighting.useMutation();

  const offlineMarkChecklist = useOfflineMutation({
    path: "checklist.markFromSighting",
    mutationFn: (input: { speciesId: string; latitude: number; longitude: number }) =>
      markChecklistMutation.mutateAsync(input),
  });

  const offlineCreateSighting = useOfflineMutation({
    path: "sighting.create",
    mutationFn: (input: {
      driveSessionId: string;
      speciesId: string;
      latitude: number;
      longitude: number;
      count: number;
    }) => createSightingMutation.mutateAsync(input),
    onSuccess: (_result, input) => {
      offlineMarkChecklist.mutate({
        speciesId: input.speciesId,
        latitude: input.latitude,
        longitude: input.longitude,
      });
      onSightingLogged?.();
    },
  });

  const handleTap = useCallback(
    (species: QuickSpecies) => {
      triggerHaptic();
      const pos = currentPosition ?? { lat: -24.25, lng: 31.15 };

      setQuickSpecies((prev) =>
        prev.map((s) =>
          s.speciesId === species.speciesId
            ? { ...s, count: s.count + 1, lastSightedAt: Date.now() }
            : s,
        ),
      );

      void updateTripSpecies(
        species.speciesId,
        species.commonName,
        species.category,
        species.imageUrl,
        1,
      );

      const sightingId = generateTempId();
      void addLocalSighting({
        id: sightingId,
        speciesId: species.speciesId,
        latitude: pos.lat,
        longitude: pos.lng,
        count: 1,
      });

      offlineCreateSighting.mutate({
        driveSessionId,
        speciesId: species.speciesId,
        latitude: pos.lat,
        longitude: pos.lng,
        count: 1,
      });
    },
    [currentPosition, driveSessionId, offlineCreateSighting],
  );

  const handleDecrement = useCallback(
    (speciesId: string) => {
      triggerHaptic();
      setQuickSpecies((prev) =>
        prev
          .map((s) =>
            s.speciesId === speciesId ? { ...s, count: s.count - 1 } : s,
          )
          .filter((s) => s.count > 0),
      );
      void updateTripSpecies(speciesId, "", "", null, -1);
      setLongPressTarget(null);
    },
    [],
  );

  const handleAddFromSearch = useCallback(
    (species: { id: string; commonName: string; category: string; imageUrl: string | null }) => {
      triggerHaptic();
      const pos = currentPosition ?? { lat: -24.25, lng: 31.15 };

      const existing = quickSpecies.find((s) => s.speciesId === species.id);
      if (existing) {
        handleTap(existing);
      } else {
        const newEntry: QuickSpecies = {
          speciesId: species.id,
          commonName: species.commonName,
          category: species.category,
          imageUrl: species.imageUrl,
          count: 1,
          lastSightedAt: Date.now(),
        };
        setQuickSpecies((prev) => [newEntry, ...prev]);

        void updateTripSpecies(species.id, species.commonName, species.category, species.imageUrl, 1);

        const sightingId = generateTempId();
        void addLocalSighting({
          id: sightingId,
          speciesId: species.id,
          latitude: pos.lat,
          longitude: pos.lng,
          count: 1,
        });

        offlineCreateSighting.mutate({
          driveSessionId,
          speciesId: species.id,
          latitude: pos.lat,
          longitude: pos.lng,
          count: 1,
        });
      }

      setSearchQuery("");
      setSearchOpen(false);
    },
    [currentPosition, driveSessionId, handleTap, offlineCreateSighting, quickSpecies],
  );

  const handleLongPressStart = (speciesId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic();
      setLongPressTarget(speciesId);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const sortedSpecies = [...quickSpecies].sort((a, b) => {
    if (b.lastSightedAt !== a.lastSightedAt) return b.lastSightedAt - a.lastSightedAt;
    return a.commonName.localeCompare(b.commonName);
  });

  const searchResults = searchQuery.length > 1
    ? (speciesSearch.data ?? []).filter(
        (s) => !quickSpecies.some((qs) => qs.speciesId === s.id),
      )
    : [];

  return (
    <div className="flex max-h-[50vh] flex-col rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-brand-khaki/20 px-3 py-2">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/20 transition active:scale-95"
        >
          <svg className="h-5 w-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-brand-dark">
          {sortedSpecies.length} species · {sortedSpecies.reduce((sum, s) => sum + s.count, 0)} sightings
        </span>
      </div>

      {searchOpen && (
        <div className="border-b border-brand-khaki/20 p-3">
          <input
            type="text"
            placeholder="Search species to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-brand-khaki/30 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
          />
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-brand-khaki/20">
              {searchResults.map((species) => (
                <button
                  key={species.id}
                  onClick={() => handleAddFromSearch(species)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition active:bg-brand-cream"
                >
                  {species.imageUrl ? (
                    <img src={species.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-cream text-xs font-bold text-brand-brown">
                      {species.commonName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-brand-dark">{species.commonName}</span>
                    <span className="ml-2 text-xs text-brand-khaki">{species.category}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain p-2">
        {sortedSpecies.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-brand-khaki">No sightings yet</p>
            <button
              onClick={() => setSearchOpen(true)}
              className="mt-2 text-sm font-medium text-brand-green"
            >
              Tap + to add a species
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sortedSpecies.map((species) => (
              <div key={species.speciesId} className="relative">
                <button
                  onClick={() => {
                    if (longPressTarget !== species.speciesId) {
                      handleTap(species);
                    }
                  }}
                  onTouchStart={() => handleLongPressStart(species.speciesId)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                  onMouseDown={() => handleLongPressStart(species.speciesId)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  className="flex min-h-[80px] w-full flex-col items-center justify-center gap-1 rounded-xl bg-brand-cream/60 p-2 transition active:scale-95 active:bg-brand-gold/20"
                >
                  {species.imageUrl ? (
                    <img src={species.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-brown/20 text-sm font-bold text-brand-brown">
                      {species.commonName.charAt(0)}
                    </div>
                  )}
                  <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-brand-dark">
                    {species.commonName}
                  </span>
                </button>
                <div className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-green px-1 text-xs font-bold text-white shadow">
                  {species.count}
                </div>

                {longPressTarget === species.speciesId && (
                  <div className="absolute inset-x-0 -bottom-10 z-10 flex justify-center gap-2">
                    <button
                      onClick={() => handleDecrement(species.speciesId)}
                      className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg"
                    >
                      −1
                    </button>
                    <button
                      onClick={() => setLongPressTarget(null)}
                      className="rounded-lg bg-brand-dark px-3 py-1 text-xs font-bold text-white shadow-lg"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
