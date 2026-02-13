"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useOfflineMutation } from "~/lib/use-offline-mutation";

interface SightingFormProps {
  driveSessionId: string;
  latitude: number;
  longitude: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function SightingForm({
  driveSessionId,
  latitude,
  longitude,
  onComplete,
  onCancel,
}: SightingFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [selectedSpeciesName, setSelectedSpeciesName] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState("");

  const speciesSearch = api.species.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 1 },
  );

  const speciesList = api.species.list.useQuery(undefined, {
    enabled: searchQuery.length <= 1,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });

  const markChecklistMutation = api.checklist.markFromSighting.useMutation();
  const createSightingMutation = api.sighting.create.useMutation();

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
      onComplete();
    },
  });

  const displayedSpecies = searchQuery.length > 1
    ? speciesSearch.data ?? []
    : speciesList.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpeciesId) return;

    offlineCreateSighting.mutate({
      driveSessionId,
      speciesId: selectedSpeciesId,
      latitude,
      longitude,
      count,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-4 shadow-lg">
      <h3 className="text-lg font-semibold text-brand-dark">Log Sighting</h3>

      <div className="text-sm text-brand-khaki">
        Location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-dark">Species</label>
        <input
          type="text"
          placeholder="Search species..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedSpeciesId(null);
            setSelectedSpeciesName(null);
          }}
          className="mt-1 block w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />

        {selectedSpeciesName ? (
          <div className="mt-2 flex items-center gap-2 rounded bg-brand-cream px-3 py-2">
            <span className="text-sm font-medium text-brand-brown">{selectedSpeciesName}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedSpeciesId(null);
                setSelectedSpeciesName(null);
              }}
              className="text-brand-khaki hover:text-brand-dark"
            >
              x
            </button>
          </div>
        ) : (
          <div className="mt-1 max-h-40 overflow-y-auto rounded border border-brand-khaki/20">
            {displayedSpecies.map((species) => (
              <button
                key={species.id}
                type="button"
                onClick={() => {
                  setSelectedSpeciesId(species.id);
                  setSelectedSpeciesName(species.commonName);
                  setSearchQuery("");
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-cream"
              >
                <span className="font-medium text-brand-dark">{species.commonName}</span>
                <span className="ml-2 text-xs text-brand-khaki">{species.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-dark">Count</label>
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="mt-1 block w-20 rounded-md border border-brand-khaki/30 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-dark">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-brand-khaki/30 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none"
          placeholder="Optional notes..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!selectedSpeciesId || offlineCreateSighting.isPending}
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-green-light disabled:opacity-50"
        >
          {offlineCreateSighting.isPending ? "Saving..." : "Save Sighting"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-brand-cream px-4 py-2 text-sm font-medium text-brand-dark transition hover:bg-brand-cream/70"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
