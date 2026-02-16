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
  onSightingLogged?: (totalCount: number, speciesCount: number) => void;
  onCollapse?: () => void;
}

const CATEGORIES = ["All", "Mammal", "Bird", "Reptile", "Creepy Crawlies"] as const;

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
  const [confirmDecrement, setConfirmDecrement] = useState<string | null>(null);
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
      notes?: string;
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
    (species: { id: string; commonName: string; category: string; imageUrl: string | null }, heardOnly = false) => {
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

      const notes = heardOnly ? "Heard only" : undefined;
      const sightingId = generateTempId();
      void addLocalSighting({
        id: sightingId,
        speciesId: species.id,
        latitude: pos.lat,
        longitude: pos.lng,
        count: 1,
        notes,
      });

      offlineCreateSighting.mutate({
        driveSessionId,
        speciesId: species.id,
        latitude: pos.lat,
        longitude: pos.lng,
        count: 1,
        notes,
      });

      const newSpeciesCount = existing ? quickSpecies.length : quickSpecies.length + 1;
      const newTotal = quickSpecies.reduce((sum, s) => sum + s.count, 0) + 1;
      onSightingLogged?.(newTotal, newSpeciesCount);
    },
    [currentPosition, driveSessionId, offlineCreateSighting, quickSpecies, onSightingLogged],
  );

  const handleDecrementConfirm = useCallback(
    (speciesId: string) => {
      triggerHaptic();
      const target = quickSpecies.find((s) => s.speciesId === speciesId);
      const willRemove = target?.count === 1;
      setQuickSpecies((prev) =>
        prev
          .map((s) =>
            s.speciesId === speciesId ? { ...s, count: s.count - 1 } : s,
          )
          .filter((s) => s.count > 0),
      );
      void updateTripSpecies(speciesId, "", "", null, -1);
      offlineDecrementSighting.mutate({ driveSessionId, speciesId });
      setConfirmDecrement(null);
      setLongPressTarget(null);
      const newTotal = quickSpecies.reduce((sum, s) => sum + s.count, 0) - 1;
      const newSpeciesCount = willRemove ? quickSpecies.length - 1 : quickSpecies.length;
      onSightingLogged?.(Math.max(0, newTotal), newSpeciesCount);
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
    <div className="flex max-h-[55vh] flex-col rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-brand-khaki/20 px-3 py-1.5">
        <button
          onClick={() => setBrowseOpen(!browseOpen)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-95 ${browseOpen ? "bg-brand-green text-white" : "bg-brand-green/20 text-brand-green"}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="flex-1 text-xs font-semibold text-brand-dark">
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
          <div className="shrink-0 px-2 pt-2">
            <div className="flex gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-1 rounded-md px-1 py-1.5 text-[10px] font-semibold transition ${
                    activeCategory === cat
                      ? "bg-brand-brown text-white shadow-sm"
                      : "bg-brand-cream/50 text-brand-khaki"
                  }`}
                >
                  {cat === "Creepy Crawlies" ? "Crawlies" : cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-brand-khaki/30 px-2.5 py-1.5 text-xs focus:border-brand-gold focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-1 py-1">
            {allSpecies.isLoading ? (
              <p className="py-4 text-center text-sm text-brand-khaki">Loading species...</p>
            ) : filteredBrowseSpecies.length === 0 ? (
              <p className="py-4 text-center text-sm text-brand-khaki">No species found.</p>
            ) : (
              <div>
                {filteredBrowseSpecies.map((species) => {
                  const count = sightedMap.get(species.id) ?? 0;
                  return (
                    <button
                      key={species.id}
                      onClick={() => logSighting(species)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition active:bg-brand-green/10"
                    >
                      <div className="relative shrink-0">
                        <OfflineImage
                          src={species.imageUrl}
                          alt={species.commonName}
                          className="h-10 w-10 rounded-lg object-cover"
                          placeholderClassName="h-10 w-10 rounded-lg"
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
                      <div
                        role="button"
                        onClick={(e) => { e.stopPropagation(); logSighting(species, true); }}
                        className="shrink-0 rounded-lg bg-brand-cream/60 px-2 py-1 text-[10px] font-semibold text-brand-khaki transition active:scale-95 active:bg-brand-gold/20"
                      >
                        Heard
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

                  {longPressTarget === species.speciesId && confirmDecrement !== species.speciesId && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-black/60">
                      <button
                        onClick={() => setConfirmDecrement(species.speciesId)}
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
                  {confirmDecrement === species.speciesId && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-black/70">
                      <span className="text-[10px] font-semibold text-white">Remove?</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecrementConfirm(species.speciesId)}
                          className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => { setConfirmDecrement(null); setLongPressTarget(null); }}
                          className="rounded-lg bg-white/90 px-3 py-1 text-xs font-bold text-brand-dark shadow-lg"
                        >
                          No
                        </button>
                      </div>
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
