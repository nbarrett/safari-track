import { get, set, del, keys, createStore } from "idb-keyval";

export interface PendingPhoto {
  id: string;
  driveId: string;
  blob: Blob;
  lat: number | null;
  lng: number | null;
  createdAt: number;
}

const photoStore = typeof window !== "undefined"
  ? createStore("safari-track-photos", "pending")
  : undefined;

function generateId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function savePendingPhoto(
  driveId: string,
  blob: Blob,
  lat: number | null,
  lng: number | null,
): Promise<string> {
  if (!photoStore) return "";
  const id = generateId();
  const entry: PendingPhoto = { id, driveId, blob, lat, lng, createdAt: Date.now() };
  await set(id, entry, photoStore);
  return id;
}

export async function getPendingPhotos(driveId: string): Promise<PendingPhoto[]> {
  if (!photoStore) return [];
  const allKeys = await keys(photoStore);
  const entries = await Promise.all(
    allKeys.map((k) => get<PendingPhoto>(k, photoStore!)),
  );
  return entries
    .filter((e): e is PendingPhoto => !!e && e.driveId === driveId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getAllPendingPhotos(): Promise<PendingPhoto[]> {
  if (!photoStore) return [];
  const allKeys = await keys(photoStore);
  const entries = await Promise.all(
    allKeys.map((k) => get<PendingPhoto>(k, photoStore!)),
  );
  return entries
    .filter((e): e is PendingPhoto => !!e)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getPendingPhotoBlob(id: string): Promise<Blob | null> {
  if (!photoStore) return null;
  const entry = await get<PendingPhoto>(id, photoStore);
  return entry?.blob ?? null;
}

export async function removePendingPhoto(id: string): Promise<void> {
  if (!photoStore) return;
  await del(id, photoStore);
}
