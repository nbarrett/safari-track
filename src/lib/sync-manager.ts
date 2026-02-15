import {
  type QueuedMutation,
  getAll,
  remove,
  incrementRetry,
  markFailed,
  saveIdMapping,
  rewriteInput,
} from "~/lib/offline-queue";
import { vanillaClient } from "~/lib/trpc-vanilla";

type SyncEventType = "sync-started" | "sync-complete" | "sync-failed" | "sync-progress";

interface SyncEvent {
  type: SyncEventType;
  remaining?: number;
  error?: string;
}

type SyncListener = (event: SyncEvent) => void;

const MAX_RETRIES = 3;

let syncing = false;
const listeners = new Set<SyncListener>();

function emit(event: SyncEvent) {
  listeners.forEach((fn) => fn(event));
}

export function onSyncEvent(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getNestedProp(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

async function callMutation(path: string, input: unknown): Promise<unknown> {
  const parts = path.split(".");
  const procedure = getNestedProp(vanillaClient, parts);
  if (typeof procedure !== "object" || procedure === null) {
    throw new Error(`Unknown procedure: ${path}`);
  }

  const mutate = (procedure as Record<string, unknown>)["mutate"];
  if (typeof mutate !== "function") {
    throw new Error(`Not a mutation: ${path}`);
  }

  return mutate(input);
}

interface RoutePointInput {
  id: string;
  points: { lat: number; lng: number; timestamp: string }[];
}

function consolidateQueue(pending: QueuedMutation[]): QueuedMutation[] {
  const result: QueuedMutation[] = [];
  const routePointGroups = new Map<string, { merged: QueuedMutation; ids: string[] }>();

  for (const mutation of pending) {
    if (mutation.path !== "drive.addRoutePoints") {
      if (routePointGroups.size > 0) {
        for (const group of routePointGroups.values()) {
          result.push(group.merged);
        }
        routePointGroups.clear();
      }
      result.push(mutation);
      continue;
    }

    const input = mutation.input as RoutePointInput;
    const driveId = input.id;
    const existing = routePointGroups.get(driveId);

    if (existing) {
      const existingInput = existing.merged.input as RoutePointInput;
      existingInput.points = [...existingInput.points, ...input.points];
      existing.ids.push(mutation.id);
    } else {
      routePointGroups.set(driveId, {
        merged: {
          ...mutation,
          input: { id: driveId, points: [...input.points] },
        },
        ids: [mutation.id],
      });
    }
  }

  for (const group of routePointGroups.values()) {
    result.push(group.merged);
  }

  return result;
}

function collectMergedIds(pending: QueuedMutation[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  let currentDriveId: string | null = null;
  let currentIds: string[] = [];

  for (const mutation of pending) {
    if (mutation.path !== "drive.addRoutePoints") {
      if (currentDriveId !== null) {
        groups.set(currentIds[0]!, currentIds);
        currentDriveId = null;
        currentIds = [];
      }
      continue;
    }

    const input = mutation.input as RoutePointInput;
    if (input.id !== currentDriveId) {
      if (currentDriveId !== null) {
        groups.set(currentIds[0]!, currentIds);
      }
      currentDriveId = input.id;
      currentIds = [mutation.id];
    } else {
      currentIds.push(mutation.id);
    }
  }

  if (currentDriveId !== null) {
    groups.set(currentIds[0]!, currentIds);
  }

  return groups;
}

export async function drainQueue(): Promise<void> {
  if (syncing || !navigator.onLine) return;
  syncing = true;

  const pending = await getAll();
  if (pending.length === 0) {
    syncing = false;
    return;
  }

  const mergedIds = collectMergedIds(pending);
  const consolidated = consolidateQueue(pending);

  emit({ type: "sync-started", remaining: pending.length });

  const idMappings = new Map<string, string>();

  for (const mutation of consolidated) {
    const rewrittenInput = rewriteInput(mutation.input, idMappings);

    try {
      const result = await callMutation(mutation.path, rewrittenInput);

      if (
        mutation.path === "drive.start" &&
        typeof result === "object" &&
        result !== null &&
        "id" in result
      ) {
        const serverId = (result as { id: string }).id;
        const tempInput = mutation.input as Record<string, unknown> | null;
        const tempId = tempInput?.tempId as string | undefined;
        if (tempId) {
          idMappings.set(tempId, serverId);
          await saveIdMapping(tempId, serverId);
        }
      }

      const idsToRemove = mergedIds.get(mutation.id) ?? [mutation.id];
      for (const id of idsToRemove) {
        await remove(id);
      }

      const remaining = (await getAll()).length;
      emit({ type: "sync-progress", remaining });
    } catch (err) {
      const retries = await incrementRetry(mutation.id);
      if (retries >= MAX_RETRIES) {
        const idsToFail = mergedIds.get(mutation.id) ?? [mutation.id];
        for (const id of idsToFail) {
          await markFailed(id);
        }
      }
      emit({
        type: "sync-failed",
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  emit({ type: "sync-complete" });
  syncing = false;
}

export function startListening() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => void drainQueue());
}
