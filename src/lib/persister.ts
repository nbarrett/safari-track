import { get, set, createStore, del, keys } from "idb-keyval";
import type { QueryPersister } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface PersistedEntry {
  data: unknown;
  timestamp: number;
  queryHash: string;
}

const store = typeof window !== "undefined"
  ? createStore("klaserie-cache", "react-query")
  : undefined;

function queryHashKey(query: Query): string {
  return query.queryHash;
}

export const idbPersister: QueryPersister = async (queryFn, context, query) => {
  if (!store) return queryFn(context);

  const key = queryHashKey(query);

  const cached = await get<PersistedEntry>(key, store);
  if (cached && Date.now() - cached.timestamp < MAX_AGE_MS) {
    queueMicrotask(() => {
      void (async () => {
        try {
          const fresh = await queryFn(context);
          await set(key, { data: fresh, timestamp: Date.now(), queryHash: key }, store);
        } catch {
          // network error, keep cached
        }
      })();
    });
    return cached.data;
  }

  const result = await queryFn(context);
  await set(key, { data: result, timestamp: Date.now(), queryHash: key }, store);
  return result;
};

export async function clearPersistedCache() {
  if (!store) return;
  const allKeys = await keys(store);
  await Promise.all(allKeys.map((k) => del(k, store)));
}
