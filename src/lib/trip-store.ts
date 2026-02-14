import { get, set, del, createStore } from "idb-keyval";

export interface TripSpecies {
  speciesId: string;
  commonName: string;
  category: string;
  imageUrl: string | null;
  totalCount: number;
  lastSightedAt: number;
}

export interface Trip {
  id: string;
  driveIds: string[];
  species: TripSpecies[];
  startedAt: string;
}

const TRIP_KEY = "active-trip";
const tripStore = typeof window !== "undefined"
  ? createStore("klaserie-trip", "session")
  : undefined;

export async function getActiveTrip(): Promise<Trip | null> {
  if (!tripStore) return null;
  return (await get<Trip>(TRIP_KEY, tripStore)) ?? null;
}

export async function setActiveTrip(trip: Trip): Promise<void> {
  if (!tripStore) return;
  await set(TRIP_KEY, trip, tripStore);
}

export async function clearActiveTrip(): Promise<void> {
  if (!tripStore) return;
  await del(TRIP_KEY, tripStore);
}

export async function addDriveToTrip(driveId: string): Promise<Trip> {
  const existing = await getActiveTrip();
  if (existing) {
    existing.driveIds.push(driveId);
    await setActiveTrip(existing);
    return existing;
  }
  const trip: Trip = {
    id: `trip_${Date.now()}`,
    driveIds: [driveId],
    species: [],
    startedAt: new Date().toISOString(),
  };
  await setActiveTrip(trip);
  return trip;
}

export async function updateTripSpecies(
  speciesId: string,
  commonName: string,
  category: string,
  imageUrl: string | null,
  countDelta: number,
): Promise<void> {
  const trip = await getActiveTrip();
  if (!trip) return;

  const existing = trip.species.find((s) => s.speciesId === speciesId);
  if (existing) {
    existing.totalCount += countDelta;
    existing.lastSightedAt = Date.now();
    if (existing.totalCount <= 0) {
      trip.species = trip.species.filter((s) => s.speciesId !== speciesId);
    }
  } else if (countDelta > 0) {
    trip.species.push({
      speciesId,
      commonName,
      category,
      imageUrl,
      totalCount: countDelta,
      lastSightedAt: Date.now(),
    });
  }
  await setActiveTrip(trip);
}
