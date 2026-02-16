# Offline-First Mode

Safari Track is designed for guides, guests, and lodge staff operating in reserves where cellular coverage is unreliable. The app works fully offline — storing data locally, caching images, and syncing to the server when connectivity returns.

## Getting Started (User Onboarding)

The app must be set up **once while connected to Wi-Fi** (e.g. at the lodge). After that, it works fully offline in the reserve.

### First-time setup (requires Wi-Fi)

1. Open the app URL in the phone's browser (Safari on iPhone, Chrome on Android)
2. Sign in with lodge credentials
3. Navigate to the **Checklist** page — this triggers caching of all 243 species images in the background
4. Wait a moment for images to finish downloading (visible in the image thumbnails loading)
5. **Add to Home Screen:**
   - **iPhone:** Tap the Share button (square with arrow) > "Add to Home Screen"
   - **Android:** Tap the browser menu (three dots) > "Add to Home Screen" or "Install app"
6. The app icon now appears on the home screen

From this point on, the app works without signal.

### Launching offline

After the initial setup, tapping the home screen icon:

1. Launches the app in standalone mode (no browser chrome, looks like a native app)
2. The service worker serves the entire app from cache — no network request needed
3. All data (species, checklist progress, lodge info) loads from IndexedDB
4. Users can start drives, log sightings, and browse the checklist with full images
5. An amber "Offline" indicator appears in the nav bar

### Syncing when back online

When the user returns to Wi-Fi coverage (e.g. back at the lodge):

1. Opening the app triggers the sync manager automatically
2. All queued mutations (sightings, checklist toggles, drive data) are sent to the server
3. The nav bar shows "Syncing..." then briefly "Synced" when complete
4. Fresh data is fetched from the server to update the local cache

### Important notes

- If a user clears their browser data or hasn't opened the app in over 7 days, the cache may be evicted and the setup must be repeated on Wi-Fi
- Map tiles are only cached for areas previously viewed while online — zoom and pan around the reserve's roads during the initial setup to pre-cache the area
- The app must be in the foreground (open on screen) for sync to trigger — it does not sync in the background

## Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| **Android (Chrome)** | Full | Installs like a native app. All offline features work reliably. |
| **iPhone (Safari)** | Full with caveats | Service worker, caching, and IndexedDB all work. See iOS notes below. |
| **Desktop (Chrome/Edge/Firefox)** | Full | Useful for reviewing drive history and managing species on a laptop. |

### iOS-specific behaviour

- **No background sync** — the app only syncs when opened in the foreground. This is fine for the typical workflow (return to lodge, open app on Wi-Fi).
- **Cache eviction** — iOS may clear cached data if the PWA hasn't been opened in approximately 7 days. Daily use prevents this.
- **Screen auto-lock** — iOS may lock the screen during long drives. Guides should adjust their Auto-Lock setting (Settings > Display & Brightness > Auto-Lock > Never) to keep GPS tracking active during a drive.
- **GPS permission** — on first use, Safari will prompt for location access. Tap "Allow" for drive tracking to work. If using the home screen app, iOS may prompt again separately.

## How It Works

### 1. Progressive Web App (PWA)

The app is installable to a device's home screen via the browser's "Add to Home Screen" prompt. Once installed, it behaves like a native app — launching in standalone mode with no browser chrome.

**Relevant files:**
- `src/app/manifest.ts` — Web manifest (app name, icons, theme colours)
- `public/icon-192.png`, `public/icon-512.png` — Home screen icons
- `src/app/layout.tsx` — PWA metadata in the `<head>`

### 2. Service Worker & Caching

A service worker (powered by [Serwist](https://serwist.pages.dev/)) intercepts all network requests and applies caching strategies:

| Content | Strategy | Cache Name | Retention |
|---------|----------|------------|-----------|
| App shell (HTML, JS, CSS) | Precache at build | Serwist default | Until next deploy |
| Species images (Wikipedia/Wikimedia) | CacheFirst | `species-images` | 30 days, max 300 |
| Strava drive photos | CacheFirst | `strava-images` | 30 days, max 100 |
| Map tiles (OpenStreetMap) | CacheFirst | `map-tiles` | 7 days, max 500 |
| tRPC API responses | NetworkFirst (3s timeout) | `trpc-api` | 7 days, max 50 |

**CacheFirst** means the cached version is always used if available — the network is only hit on a cache miss. This makes image-heavy pages instant after the first load.

**NetworkFirst** means the app tries the server first, but falls back to the cached response if the network is unavailable or takes longer than 3 seconds.

**Relevant files:**
- `src/app/sw.ts` — Service worker configuration
- `next.config.ts` — `withSerwist()` wrapper that bundles the SW at build time

The generated `public/sw.js` is gitignored and rebuilt on every `pnpm build`.

### 3. Species Image Pre-Caching

When the Checklist page loads, all ~243 species image URLs are proactively fetched and stored in the `species-images` cache. This runs in the background in batches of 6, so the user doesn't need to scroll through every species to cache their images.

After this initial cache warm-up, every species image is available offline.

**Relevant files:**
- `src/lib/precache-images.ts` — Batch pre-caching logic
- `src/app/checklist/page.tsx` — Triggers pre-caching in a `useEffect` when species data loads

All external `<img>` tags use `crossOrigin="anonymous"` to ensure CORS-compatible caching (prevents opaque responses that inflate cache storage).

### 4. Data Persistence (IndexedDB)

All React Query data is persisted to IndexedDB via a custom persister. When the app restarts (or reloads offline), cached query data is restored from IndexedDB before any network requests are made.

| Setting | Value |
|---------|-------|
| Storage backend | IndexedDB via `idb-keyval` (store: `klaserie-cache`) |
| Max age | 7 days |
| Network mode | `offlineFirst` (serve cache, then revalidate) |
| Species/lodge data | `gcTime: Infinity`, `staleTime: 24h` (rarely changes) |

This means navigating between pages while offline still shows real data — species lists, checklist state, drive history — all from the local cache.

**Relevant files:**
- `src/lib/persister.ts` — IndexedDB persister implementation
- `src/trpc/query-client.ts` — Query client configured with persister + offlineFirst mode

### 5. Offline Mutation Queue

Mutations (creating sightings, toggling checklist items, adding route points, ending drives) work offline. When a mutation is triggered without connectivity:

1. The mutation is serialised and stored in an IndexedDB queue (`klaserie-mutations`)
2. The UI updates optimistically as if it succeeded
3. When connectivity returns, the sync manager drains the queue in FIFO order
4. Failed mutations retry up to 3 times before being marked as failed

```
User action (offline)
  -> useOfflineMutation hook
    -> enqueue(path, input) to IndexedDB
    -> optimistic UI update
    -> return success-like result

Connectivity restored
  -> window "online" event
    -> sync manager drains queue
    -> calls each mutation via vanilla tRPC client
    -> removes successful entries
```

**Relevant files:**
- `src/lib/offline-queue.ts` — IndexedDB mutation queue with temp ID mapping
- `src/lib/sync-manager.ts` — Listens for `online` events, drains queue
- `src/lib/trpc-vanilla.ts` — Non-React tRPC client used for replay
- `src/lib/use-offline-mutation.ts` — React hook wrapping online/offline logic

### 6. Offline Game Drives

A complete game drive works fully offline:

**Starting a drive offline:**
- A temporary UUID is generated locally
- Drive state (ID, start time, route points, sightings) is persisted to IndexedDB
- GPS tracking starts immediately — route points are buffered and persisted locally

**During the drive:**
- GPS points are flushed every 10 seconds and saved to both local state and IndexedDB
- If the app crashes or is restarted, the GPS buffer is restored from IndexedDB
- Sightings are logged against cached species data and queued for sync
- The map renders from cached tiles (for areas the user has previously viewed)

**Ending a drive offline:**
- The end-drive mutation is queued
- Local drive state is cleared

**When connectivity returns:**
- The sync manager replays all queued mutations
- For offline-started drives, the server returns a real MongoDB ObjectId
- Subsequent queued mutations (route points, sightings) are rewritten with the real ID before replay

**Relevant files:**
- `src/lib/drive-store.ts` — Local drive session in IndexedDB
- `src/app/_components/gps-tracker.tsx` — GPS buffer persistence
- `src/app/drive/page.tsx` — Offline-aware drive UI

### 7. Offline Status Indicator

A compact indicator in the navigation bar shows the current connectivity state:

| State | Display |
|-------|---------|
| Offline | Amber pill: "Offline" + pending mutation count |
| Syncing | Animated spinner: "Syncing (N)..." |
| Synced | Green pill: "Synced" (auto-dismisses after 3s) |
| Online with pending | Gold pill: "N pending" |
| Online, nothing pending | Hidden |

**Relevant files:**
- `src/app/_components/offline-indicator.tsx` — Status UI component
- `src/lib/use-online-status.ts` — `navigator.onLine` + event listener hook
- `src/lib/use-pending-sync.ts` — Polls queue count + listens for sync events
- `src/app/_components/nav.tsx` — Mounts the indicator

## IndexedDB Stores

The app uses several IndexedDB databases:

| Database | Object Store | Purpose |
|----------|-------------|---------|
| `klaserie-cache` | `react-query` | Persisted React Query data |
| `klaserie-mutations` | `pending` | Queued offline mutations |
| `klaserie-id-map` | `entries` | Temp ID to server ID mappings |
| `klaserie-gps` | `buffer` | GPS route point backup |
| `klaserie-drive` | `session` | Active drive session state |

## Dependencies

| Package | Purpose |
|---------|---------|
| `@serwist/next` | Next.js service worker integration (build-time bundling) |
| `serwist` | Service worker runtime — caching strategies, precaching, plugins |
| `idb-keyval` | Lightweight IndexedDB key-value wrapper (~600 bytes) |

## Testing Offline Mode

1. Run `pnpm build && pnpm start` (service worker is disabled in dev mode)
2. Open the app and navigate to the Checklist page (triggers species image pre-caching)
3. Open Chrome DevTools > Application > Service Workers — verify SW is active
4. Open Application > Cache Storage — verify `species-images`, `map-tiles` etc. are populated
5. Enable airplane mode in DevTools > Network tab
6. Reload the app — it loads from cache with all images
7. Navigate to Checklist — species with images are visible offline
8. Toggle a species as spotted — optimistic update shows immediately
9. Start a game drive — GPS tracking works, route points queue locally
10. Log a sighting — form works with cached species data
11. Disable airplane mode — pending mutations sync automatically
12. Check the Offline Indicator in the nav bar transitions through "Syncing" to "Synced"
