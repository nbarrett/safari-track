import { get, set, del, createStore } from "idb-keyval";

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface LocalSighting {
  id: string;
  speciesId: string;
  latitude: number;
  longitude: number;
  count: number;
  notes?: string;
}

export interface LocalDrive {
  id: string;
  startedAt: string;
  routePoints: GpsPoint[];
  sightings: LocalSighting[];
}

const DRIVE_KEY = "active-drive";
const driveStore = typeof window !== "undefined"
  ? createStore("klaserie-drive", "session")
  : undefined;

export async function getLocalDrive(): Promise<LocalDrive | null> {
  if (!driveStore) return null;
  return (await get<LocalDrive>(DRIVE_KEY, driveStore)) ?? null;
}

export async function setLocalDrive(drive: LocalDrive): Promise<void> {
  if (!driveStore) return;
  await set(DRIVE_KEY, drive, driveStore);
}

export async function clearLocalDrive(): Promise<void> {
  if (!driveStore) return;
  await del(DRIVE_KEY, driveStore);
}

export async function addLocalRoutePoints(points: GpsPoint[]): Promise<void> {
  if (!driveStore) return;
  const drive = await getLocalDrive();
  if (!drive) return;
  drive.routePoints = [...drive.routePoints, ...points];
  await set(DRIVE_KEY, drive, driveStore);
}

export async function addLocalSighting(sighting: LocalSighting): Promise<void> {
  if (!driveStore) return;
  const drive = await getLocalDrive();
  if (!drive) return;
  drive.sightings = [...drive.sightings, sighting];
  await set(DRIVE_KEY, drive, driveStore);
}
