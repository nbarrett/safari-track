"use client";

import { useEffect, useState } from "react";
import { getActiveTrip, type Trip, clearActiveTrip } from "~/lib/trip-store";

interface TripSummaryProps {
  onClose: () => void;
}

export function TripSummary({ onClose }: TripSummaryProps) {
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    void getActiveTrip().then(setTrip);
  }, []);

  if (!trip) {
    return (
      <div className="rounded-2xl bg-white/95 p-6 shadow-xl backdrop-blur-sm">
        <p className="text-center text-sm text-brand-khaki">No active trip</p>
        <button onClick={onClose} className="mt-3 w-full rounded-xl bg-brand-cream py-2 text-sm font-medium text-brand-dark">
          Close
        </button>
      </div>
    );
  }

  const sortedSpecies = [...trip.species].sort((a, b) => b.totalCount - a.totalCount);
  const totalSightings = sortedSpecies.reduce((sum, s) => sum + s.totalCount, 0);

  const handleEndTrip = async () => {
    await clearActiveTrip();
    onClose();
  };

  return (
    <div className="flex max-h-[70vh] flex-col rounded-2xl bg-white/95 shadow-xl backdrop-blur-sm">
      <div className="border-b border-brand-khaki/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-dark">Trip Summary</h3>
          <button onClick={onClose} className="text-brand-khaki">✕</button>
        </div>
        <div className="mt-1 flex gap-4 text-sm text-brand-khaki">
          <span>{trip.driveIds.length} drives</span>
          <span>{sortedSpecies.length} species</span>
          <span>{totalSightings} total sightings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sortedSpecies.length === 0 ? (
          <p className="py-6 text-center text-sm text-brand-khaki">No sightings recorded yet</p>
        ) : (
          <div className="space-y-2">
            {sortedSpecies.map((species) => (
              <div
                key={species.speciesId}
                className="flex items-center gap-3 rounded-xl bg-brand-cream/40 px-3 py-2"
              >
                {species.imageUrl ? (
                  <img src={species.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-brown/20 text-sm font-bold text-brand-brown">
                    {species.commonName.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium text-brand-dark">{species.commonName}</span>
                  <span className="ml-2 text-xs text-brand-khaki">{species.category}</span>
                </div>
                <div className="flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-green px-2 text-sm font-bold text-white">
                  {species.totalCount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-brand-khaki/20 p-3">
        <button
          onClick={handleEndTrip}
          className="w-full rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition active:scale-95"
        >
          End Trip
        </button>
      </div>
    </div>
  );
}
