"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { useOfflineMutation } from "~/lib/use-offline-mutation";
import { updateTripSpecies } from "~/lib/trip-store";
import { addLocalSighting, setSpeciesSummary } from "~/lib/drive-store";
import { generateTempId } from "~/lib/offline-queue";
import { OfflineImage } from "~/app/_components/offline-image";

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
  onSightingLogged?: (totalCount: number) => void;
  onCollapse?: () => void;
}

const CATEGORIES = ["All", "Mammal", "Bird", "Reptile"] as const;

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
  onCollapse,
}: QuickSightingPanelProps) {
  const [quickSpecies, setQuickSpecies] = useState<QuickSpecies[]>(initialSpecies ?? []);
  const [searchQuery, setSearchQuery] = useState("");
  const [browseOpen, setBrowseOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [longPressTarget, setLongPressTarget] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(true);

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    void setSpeciesSummary(quickSpecies);
  }, [quickSpecies]);

  const allSpecies = api.species.list.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });

  const createSightingMutation = api.sighting.create.useMutation();
  const decrementSightingMutation = api.sighting.decrementBySpecies.useMutation();
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
    },
  });

  const offlineDecrementSighting = useOfflineMutation({
    path: "sighting.decrementBySpecies",
    mutationFn: (input: { driveSessionId: string; speciesId: string }) =>
      decrementSightingMutation.mutateAsync(input),
  });

  const logSighting = useCallback(
    (species: { id: string; commonName: string; category: string; imageUrl: string | null }) => {
      triggerHaptic();
      const pos = currentPosition ?? { lat: -24.25, lng: 31.15 };

      const existing = quickSpecies.find((s) => s.speciesId === species.id);
      if (existing) {
        setQuickSpecies((prev) =>
          prev.map((s) =>
            s.speciesId === species.id
              ? { ...s, count: s.count + 1, lastSightedAt: Date.now() }
              : s,
          ),
        );
      } else {
        setQuickSpecies((prev) => [
          {
            speciesId: species.id,
            commonName: species.commonName,
            category: species.category,
            imageUrl: species.imageUrl,
            count: 1,
            lastSightedAt: Date.now(),
          },
          ...prev,
        ]);
      }

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

      const newTotal = quickSpecies.reduce((sum, s) => sum + s.count, 0) + 1;
      onSightingLogged?.(newTotal);
    },
    [currentPosition, driveSessionId, offlineCreateSighting, quickSpecies, onSightingLogged],
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
      offlineDecrementSighting.mutate({ driveSessionId, speciesId });
      setLongPressTarget(null);
      const newTotal = quickSpecies.reduce((sum, s) => sum + s.count, 0) - 1;
      onSightingLogged?.(Math.max(0, newTotal));
    },
    [driveSessionId, offlineDecrementSighting, quickSpecies, onSightingLogged],
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

  const sightedMap = new Map(quickSpecies.map((s) => [s.speciesId, s.count]));

  const filteredBrowseSpecies = (allSpecies.data ?? []).filter((s) => {
    if (activeCategory !== "All" && s.category !== activeCategory) return false;
    if (searchQuery.length > 0) {
      return s.commonName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex max-h-[60vh] flex-col rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-brand-khaki/20 px-3 py-2">
        <button
          onClick={() => setBrowseOpen(!browseOpen)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95 ${browseOpen ? "bg-brand-green text-white" : "bg-brand-green/20 text-brand-green"}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="flex-1 text-sm font-semibold text-brand-dark">
          {sortedSpecies.length} species · {sortedSpecies.reduce((sum, s) => sum + s.count, 0)} sightings
        </span>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-95 active:bg-brand-cream"
          >
            <svg className="h-5 w-5 text-brand-khaki" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {browseOpen && (
        <div className="flex min-h-0 flex-1 flex-col border-b border-brand-khaki/20">
          <div className="shrink-0 px-3 pt-3">
            <div className="flex gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                    activeCategory === cat
                      ? "bg-brand-brown text-white shadow-sm"
                      : "bg-brand-cream/50 text-brand-khaki"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search species..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2 w-full rounded-lg border border-brand-khaki/30 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-1 py-2">
            {allSpecies.isLoading ? (
              <p className="py-4 text-center text-sm text-brand-khaki">Loading species...</p>
            ) : filteredBrowseSpecies.length === 0 ? (
              <p className="py-4 text-center text-sm text-brand-khaki">No species found.</p>
            ) : (
              <div className="space-y-0.5">
                {filteredBrowseSpecies.map((species) => {
                  const count = sightedMap.get(species.id) ?? 0;
                  return (
                    <button
                      key={species.id}
                      onClick={() => logSighting(species)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition active:scale-[0.98] active:bg-brand-gold/20"
                    >
                      <div className="relative shrink-0">
                        <OfflineImage
                          src={species.imageUrl}
                          alt={species.commonName}
                          className="h-12 w-12 rounded-xl object-cover"
                          placeholderClassName="h-12 w-12 rounded-xl"
                        />
                        {count > 0 && (
                          <div className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-green px-1 text-[10px] font-bold text-white shadow">
                            {count}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm font-medium ${count > 0 ? "text-brand-green" : "text-brand-dark"}`}>
                          {species.commonName}
                        </div>
                        <div className="text-xs text-brand-khaki">{species.category}</div>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green/15">
                        <svg className="h-5 w-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!browseOpen && (
        <div className="flex-1 overflow-y-auto overscroll-contain p-2">
          {sortedSpecies.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-brand-khaki">No sightings yet</p>
              <button
                onClick={() => setBrowseOpen(true)}
                className="mt-2 text-sm font-medium text-brand-green"
              >
                Tap + to browse species
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {sortedSpecies.map((species) => (
                <div key={species.speciesId} className="relative">
                  <button
                    onClick={() => {
                      if (longPressTarget !== species.speciesId) {
                        logSighting({
                          id: species.speciesId,
                          commonName: species.commonName,
                          category: species.category,
                          imageUrl: species.imageUrl,
                        });
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
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-black/60">
                      <button
                        onClick={() => handleDecrement(species.speciesId)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white shadow-lg"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => setLongPressTarget(null)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-brand-dark shadow-lg"
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
