const CACHE_NAME = "species-images";

export async function precacheSpeciesImages(imageUrls: string[]) {
  if (typeof window === "undefined" || !("caches" in window)) return;

  const cache = await caches.open(CACHE_NAME);
  const existing = await cache.keys();
  const cachedUrls = new Set(existing.map((req) => req.url));

  const uncached = imageUrls.filter((url) => !cachedUrls.has(url));
  if (uncached.length === 0) return;

  const batchSize = 6;
  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (url) => {
        const response = await fetch(url, { mode: "cors" });
        if (response.ok) {
          await cache.put(url, response);
        }
      }),
    );
  }
}
