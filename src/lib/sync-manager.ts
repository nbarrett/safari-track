import {
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

export async function drainQueue(): Promise<void> {
  if (syncing || !navigator.onLine) return;
  syncing = true;

  const pending = await getAll();
  if (pending.length === 0) {
    syncing = false;
    return;
  }

  emit({ type: "sync-started", remaining: pending.length });

  const idMappings = new Map<string, string>();

  for (const mutation of pending) {
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

      await remove(mutation.id);
      const remaining = (await getAll()).length;
      emit({ type: "sync-progress", remaining });
    } catch (err) {
      const retries = await incrementRetry(mutation.id);
      if (retries >= MAX_RETRIES) {
        await markFailed(mutation.id);
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
