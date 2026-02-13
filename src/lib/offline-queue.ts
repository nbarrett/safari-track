import { get, set, createStore, keys, del } from "idb-keyval";

export interface QueuedMutation {
  id: string;
  path: string;
  input: unknown;
  createdAt: number;
  retryCount: number;
  status: "pending" | "failed";
}

interface IdMapping {
  tempId: string;
  serverId: string;
}

const mutationStore = typeof window !== "undefined"
  ? createStore("klaserie-mutations", "pending")
  : undefined;

const idMapStore = typeof window !== "undefined"
  ? createStore("klaserie-id-map", "entries")
  : undefined;

function generateId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateTempId(): string {
  return generateId();
}

export async function enqueue(path: string, input: unknown): Promise<string> {
  if (!mutationStore) return "";
  const id = generateId();
  const entry: QueuedMutation = {
    id,
    path,
    input,
    createdAt: Date.now(),
    retryCount: 0,
    status: "pending",
  };
  await set(id, entry, mutationStore);
  return id;
}

export async function getAll(): Promise<QueuedMutation[]> {
  if (!mutationStore) return [];
  const allKeys = await keys(mutationStore);
  const entries = await Promise.all(
    allKeys.map((k) => get<QueuedMutation>(k, mutationStore!)),
  );
  return entries
    .filter((e): e is QueuedMutation => !!e && e.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function count(): Promise<number> {
  const all = await getAll();
  return all.length;
}

export async function remove(id: string): Promise<void> {
  if (!mutationStore) return;
  await del(id, mutationStore);
}

export async function markFailed(id: string): Promise<void> {
  if (!mutationStore) return;
  const entry = await get<QueuedMutation>(id, mutationStore);
  if (entry) {
    entry.status = "failed";
    await set(id, entry, mutationStore);
  }
}

export async function incrementRetry(id: string): Promise<number> {
  if (!mutationStore) return 0;
  const entry = await get<QueuedMutation>(id, mutationStore);
  if (!entry) return 0;
  entry.retryCount += 1;
  await set(id, entry, mutationStore);
  return entry.retryCount;
}

export async function clearQueue(): Promise<void> {
  if (!mutationStore) return;
  const allKeys = await keys(mutationStore);
  await Promise.all(allKeys.map((k) => del(k, mutationStore!)));
}

export async function saveIdMapping(tempId: string, serverId: string): Promise<void> {
  if (!idMapStore) return;
  await set(tempId, { tempId, serverId } satisfies IdMapping, idMapStore);
}

export async function getServerId(tempId: string): Promise<string | null> {
  if (!idMapStore) return null;
  const mapping = await get<IdMapping>(tempId, idMapStore);
  return mapping?.serverId ?? null;
}

export async function resolveId(id: string): Promise<string> {
  if (!id.startsWith("temp_")) return id;
  const serverId = await getServerId(id);
  return serverId ?? id;
}

export function rewriteInput(input: unknown, idMappings: Map<string, string>): unknown {
  if (typeof input !== "object" || input === null) return input;

  if (Array.isArray(input)) {
    return input.map((item) => rewriteInput(item, idMappings));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string" && idMappings.has(value)) {
      result[key] = idMappings.get(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = rewriteInput(value, idMappings);
    } else {
      result[key] = value;
    }
  }
  return result;
}
