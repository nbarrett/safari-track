<p align="center">
  <img src="public/logo-icon.png" alt="Safari Track" width="280" />
</p>

<h1 align="center">Safari Track</h1>

<p align="center">
  <strong>GPS-tracked game drives and wildlife sighting logs for guides, guests, and lodges</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.4.0-brand?color=6B4C2E" alt="Version" />
  <img src="https://img.shields.io/badge/Next.js-15-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PWA-offline--first-4A7043" alt="PWA" />
</p>

---

## Elevator Pitch For Fred 😁

**Safari Track is a mobile app for everyone on safari — guides, guests, and lodge managers.** Guides record their GPS route in real time and tap to log every animal they spot. Guests follow along on their own device, browse the wildlife checklist, and relive drives afterwards on a beautiful map with every sighting pinned to the exact location. Lodge managers oversee all drive history and species data across the property. Everything works offline in the bush and syncs automatically when back in Wi-Fi range. Think of it as Strava for safari — but instead of tracking fitness, it tracks wildlife encounters across your lodge.

---

<p align="center">
  <img src="public/hero-wildlife-01.jpg" alt="Wildlife on safari" width="800" style="border-radius: 12px" />
</p>

## What It Does

### Game Drive Recording
<img src="public/hero-wildlife-03.jpg" alt="Game drive" width="400" align="right" style="border-radius: 8px; margin-left: 16px; margin-bottom: 16px" />

- **Live GPS tracking** with route recorded every 10 seconds
- **Speed-coloured route line** (green = slow, red = fast) like Strava
- **Direction arrow** showing which way the vehicle is heading
- **Auto-pause** when the vehicle stops, auto-resume when it moves
- **Compass** with N/E/S/W labels for navigation in the field
- **Drive timer, distance, and sighting counter** always visible
- Works completely **offline** — syncs when back in range

<br clear="both" />

### Wildlife Sighting Logger
<img src="public/hero-wildlife-05.jpg" alt="Wildlife sighting" width="400" align="right" style="border-radius: 8px; margin-left: 16px; margin-bottom: 16px" />

- **Tap to log** a sighting instantly during a drive
- **240+ species** across Mammals, Birds, Reptiles, and Creepy Crawlies
- Log count, notes, and **"Heard only"** for sounds without visuals
- **Decrement with confirmation** to prevent accidental removal
- Each sighting pinned to GPS location on the map
- Species images and category indicators

<br clear="both" />

### Personal Species Checklist
<img src="public/hero-wildlife-07.jpg" alt="Checklist" width="400" align="right" style="border-radius: 8px; margin-left: 16px; margin-bottom: 16px" />

- **Progress tracking** with percentage complete and per-category breakdowns
- Auto-updates as sightings are logged
- Filter by **category, search, or spotted-only**
- Adjustable **thumbnail sizes** (S / M / L / XL)
- **Guest browsable** — visitors can explore without signing in
- First sighting date and location recorded for each species

<br clear="both" />

### Interactive Map
<img src="public/hero-wildlife-09.jpg" alt="Safari map" width="400" align="right" style="border-radius: 8px; margin-left: 16px; margin-bottom: 16px" />

- **Satellite, terrain, and street** map layers
- **Road overlay** uploaded by the lodge admin
- **Points of Interest** — tap the pin button, tap the map, name it
- Sighting markers, photo markers, and position dot with bearing arrow
- **Route overview** with fit-to-bounds and bottom panel awareness
- **Flythrough mode** replays the drive with photos on a timeline

<br clear="both" />

### Drive History & Review
- Browse all drives with sighting counts and status
- **Multi-select and bulk delete** drives
- Full route playback with sightings, photos, and statistics
- Duration, distance, average speed, max speed
- Admin users can delete any drive

### Multi-Drive Trips
- Group consecutive drives into a **trip**
- Species carry forward across drives in the same trip
- Trip summary shows aggregated sightings for the day

### Strava Integration
- **Connect your Strava account** via OAuth
- Browse and **import Strava activities** as drives (route + photos)
- **GPX import** from any GPS device

### Lodge Showcase
- Beautiful **lodge pages** with hero images and branding
- Three lodges in the Greater Kruger: Nzumba, Last Word Kitara, Dundee
- Each lodge has its own colour scheme and logo

### Offline-First PWA
- **Install to home screen** on iOS and Android
- Full functionality without internet — drives, sightings, checklist all work offline
- **Background sync** queues mutations and drains when online
- **Lock screen notifications** showing drive time and distance
- Species images pre-cached for offline browsing
- Session caching for instant app startup

### Admin Tools
- **Species management** — add, edit, delete species
- **Road data upload** — GeoJSON road network overlay on map
- **Strava credentials** — configure OAuth client for the lodge

---

<p align="center">
  <img src="public/hero-wildlife-10.jpg" alt="African wildlife" width="800" style="border-radius: 12px" />
</p>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS 4 |
| **API** | tRPC 11 (end-to-end type safety) |
| **Database** | MongoDB Atlas via Prisma ORM |
| **Auth** | NextAuth 5 (credentials, bcrypt, JWT) |
| **Maps** | Leaflet (OpenStreetMap + Esri satellite) |
| **Offline** | Service Worker (Serwist) + IndexedDB |
| **Package Manager** | pnpm |
| **Deployment** | Fly.io (Johannesburg region) |

## Data Models

| Model | Purpose |
|-------|---------|
| **User** | Account with role (ADMIN/GUIDE/VIEWER) and lodge |
| **Lodge** | Safari camp with GPS coordinates and branding |
| **Species** | Wildlife catalogue — 243+ species with images |
| **DriveSession** | Game drive with GPS route, photos, and timestamps |
| **Sighting** | Wildlife observation linked to drive, species, and location |
| **ChecklistItem** | Per-user species tracking with sighting history |
| **PointOfInterest** | Named map markers with category and icon |
| **StravaAccount** | OAuth tokens for Strava integration |
| **AppSettings** | Key-value config (Strava credentials, etc.) |

## Getting Started

### Prerequisites

- **Node.js** >= 22
- **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`)
- **MongoDB Atlas** cluster (or MongoDB 6+)

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env`:

```env
AUTH_SECRET="<generate with: npx auth secret>"
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority"
```

### Quick Start

```bash
./run-dev.sh        # macOS / Linux
.\run-dev.ps1       # Windows PowerShell
run-dev.bat          # Windows Command Prompt
```

Or manually:

```bash
pnpm install
pnpm db:push          # push schema to MongoDB
pnpm db:seed          # seed species + default admin
pnpm dev              # start at http://localhost:3003
```

### Default Admin

- **Email:** `admin@klaserie.co.za`
- **Password:** `admin123`

The seed creates 3 lodges, 243+ species, and 1 admin user.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm typecheck` | TypeScript type checker |
| `pnpm db:push` | Push Prisma schema to MongoDB |
| `pnpm db:seed` | Seed species and admin user |
| `pnpm db:studio` | Prisma Studio (database GUI) |

## iOS / Native Development

### Prerequisites

- **Xcode** 14+ (for Live Activities and Dynamic Island support, iOS 16.2+ device)
- **Apple Developer account** enrolled in the program (for device builds)

### Workflow

```bash
pnpm build            # Build the Next.js web output (required before sync)
pnpm cap:sync         # Copy web output into the iOS project and sync plugins
pnpm cap:ios          # Open the iOS project in Xcode
```

Run these in order whenever you change web code and want to test on device. Once Xcode is open, press **⌘R** to build and run on the connected device.

### iOS Project Structure

```
ios/App/
  App/
    AppDelegate.swift           # Capacitor app entry point
    LiveActivityPlugin.swift    # ActivityKit bridge (start/update/end live activity)
    App.entitlements            # App Groups capability (group.com.safaritrack.app)
    Info.plist                  # Permissions and NSSupportsLiveActivities
  DriveWidget/
    DriveActivityAttributes.swift   # Shared Live Activity data model
    DriveWidgetLiveActivity.swift   # Lock screen + Dynamic Island SwiftUI UI
    DriveWidgetBundle.swift         # Widget extension entry point
    DriveWidget.entitlements        # App Groups capability (matches main app)
    Info.plist                      # Widget extension config
  CapApp-SPM/
    Package.swift               # Swift Package Manager plugin dependencies
```

### Capacitor Scripts

| Script | Description |
|--------|-------------|
| `pnpm cap:sync` | Copy web build into iOS project and sync plugin changes |
| `pnpm cap:ios` | Open `ios/App/App.xcodeproj` in Xcode |

## Project Structure

```
src/
  app/
    _components/          # Shared components (map, GPS, sighting panel, nav)
    admin/                # Admin pages (species, roads, settings)
    api/                  # API routes (auth, tRPC, GPX upload, roads upload)
    auth/signin/          # Sign-in page
    changelog/            # What's New page
    checklist/            # Species checklist
    drive/                # Active drive recording
    drives/               # Drive history + detail + GPX import
    lodges/               # Lodge showcase pages
    profile/              # User profile and settings
    strava/               # Strava connection and activity import
  lib/                    # Utilities (offline queue, sync, notifications, stores)
  server/
    api/routers/          # tRPC routers (drive, sighting, species, poi, etc.)
    auth/                 # NextAuth config
  styles/                 # Tailwind theme
prisma/
  schema.prisma           # 9 data models
  seed.ts                 # 243+ species, 3 lodges, admin user
```

## Lodges

All three camps are in the north-west sector of the Greater Kruger:

| Lodge | Latitude | Longitude |
|-------|----------|-----------|
| Nzumba Camp | -24.1925 | 31.0742 |
| Last Word Kitara | -24.2048 | 31.0831 |
| Dundee Camp | -24.1812 | 31.0654 |

---

<p align="center">
  <img src="public/hero-elephants.jpg" alt="Elephants" width="600" style="border-radius: 12px" />
</p>

<p align="center">
  <em>Built for the guides, guests, and wildlife of the Greater Kruger.</em>
</p>
