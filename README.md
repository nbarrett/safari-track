# Klaserie Camps

A real-time wildlife tracking web application for game guides at Klaserie Private Nature Reserve. Guides log into their lodge, start a game drive, and the app tracks their GPS route while they record wildlife sightings along the way. Each guide maintains a personal species checklist that updates automatically as they log sightings.

The species checklist is also browsable by anyone without signing in.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript (strict mode, no JS files) |
| **Styling** | Tailwind CSS 4 |
| **API** | tRPC 11 (end-to-end type safety) |
| **Database** | MongoDB Atlas via Prisma ORM |
| **Auth** | NextAuth 5 (credentials provider, bcrypt, JWT sessions) |
| **Maps** | Leaflet + React-Leaflet (OpenStreetMap & Esri satellite imagery) |
| **Package Manager** | pnpm |
| **Module System** | 100% ESM (`"type": "module"`) |

## Deployment

| Setting | Value |
|---------|-------|
| **Platform** | [Fly.io](https://fly.io) |
| **Organisation** | `annix` (personal) |
| **App name** | `klaserie-camps` |
| **Region** | `jnb` (Johannesburg) |
| **CI/CD** | GitHub Actions |

## Features

### Game Drive Tracking
- Start/end drive sessions with real-time GPS recording
- Route tracked every 10 seconds via browser Geolocation API
- Interactive map showing live position, route polyline, and sighting markers
- Tap the map to log a sighting at any location

### Wildlife Sighting Log
- Search species by name with autocomplete
- Record count, notes, and GPS coordinates per sighting
- Sightings linked to the active drive session and guide

### Personal Species Checklist
- 243 pre-loaded species (mammals, birds, reptiles) from the Klaserie area
- Progress tracking: percentage complete, breakdown by category
- Auto-updates when sightings are logged
- Filter by category, search, or spotted-only view
- Browsable as a guest without signing in

### Drive History
- Browse past drives for the entire lodge
- View full route playback with all sightings on the map
- See guide name, duration, sighting count, and notes

### Authentication & Roles
- Email/password login per guide
- Roles: `ADMIN`, `GUIDE`, `VIEWER`
- Each user belongs to a lodge (Nzumba, Last Word Kitara, or Dundee)

## Getting Started

### Prerequisites

- **Node.js** >= 22
- **pnpm** (install: `corepack enable && corepack prepare pnpm@latest --activate`)
- A **MongoDB Atlas** cluster (or any MongoDB 6+ instance)

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
AUTH_SECRET="<generate with: npx auth secret>"
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority"
```

### Quick Start (automated scripts)

The dev scripts handle dependency installation, Prisma client generation, schema push, and server startup in one command.

**macOS / Linux:**
```bash
./run-dev.sh
```

**Windows (PowerShell):**
```powershell
.\run-dev.ps1
```

**Windows (Command Prompt):**
```cmd
run-dev.bat
```

The server starts at **http://localhost:3000** (override with `DEV_PORT` env var).

### Manual Setup (alternative)

```bash
pnpm install
pnpm db:push          # push schema to MongoDB
pnpm db:seed          # seed species data + default admin user
pnpm dev              # start dev server with Turbopack
```

### Seeding the Database

After the schema is pushed, seed with species data and a default admin user:

```bash
pnpm db:seed
```

Default admin credentials:
- **Email:** `admin@klaserie.co.za`
- **Password:** `admin123`

The seed creates:
- 3 lodges (Nzumba Camp, Last Word Kitara, Dundee Camp)
- 243 species (mammals, birds, reptiles)
- 1 admin user assigned to Nzumba Camp

## Stopping the Dev Server

### macOS / Linux

Press `Ctrl+C` in the terminal running the dev server, or:

```bash
./kill-dev.sh
```

To manually kill the process:

```bash
# Find and kill the Next.js dev server
lsof -ti :3000 | xargs kill
```

### Windows (PowerShell)

Press `Ctrl+C` in the terminal running the dev server, or:

```powershell
.\kill-dev.ps1
```

To manually kill the process:

```powershell
# Find PID on port 3000
netstat -ano | findstr :3000
# Kill it
Stop-Process -Id <PID> -Force
```

### Windows (Command Prompt)

Press `Ctrl+C` in the terminal, or:

```cmd
taskkill /F /IM node.exe
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm preview` | Build then start (production preview) |
| `pnpm typecheck` | Run TypeScript type checker |
| `pnpm db:push` | Push Prisma schema to MongoDB |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:seed` | Seed species and default admin user |
| `pnpm db:studio` | Open Prisma Studio (database GUI) |

## Project Structure

```
src/
  app/                        # Next.js App Router pages
    _components/              # Shared UI components
      gps-tracker.tsx         # GPS tracking hook (Geolocation API)
      home-content.tsx        # Authenticated home page
      landing-page.tsx        # Unauthenticated landing page
      map.tsx                 # Leaflet map with route/sighting layers
      nav.tsx                 # Bottom navigation bar
      session-provider.tsx    # NextAuth session wrapper
      sighting-form.tsx       # Modal form for logging sightings
    api/                      # API route handlers
      auth/[...nextauth]/     # NextAuth endpoints
      trpc/[trpc]/            # tRPC endpoint
    auth/signin/              # Sign-in page
    checklist/                # Species checklist (public + personal)
    drive/                    # Active drive session page
    drives/                   # Drive history list
    drives/[id]/              # Drive detail/review page
    layout.tsx                # Root layout
    page.tsx                  # Home page (landing or dashboard)
  server/
    api/
      root.ts                 # tRPC router aggregation
      routers/
        checklist.ts          # Checklist CRUD + stats
        drive.ts              # Drive session management + GPS points
        sighting.ts           # Sighting CRUD
        species.ts            # Species catalogue + search (public)
      trpc.ts                 # tRPC context + middleware
    auth/
      config.ts               # NextAuth config (credentials, JWT, roles)
      index.ts                # Auth utility exports
    db.ts                     # Prisma client singleton
  trpc/                       # tRPC client setup
  styles/globals.css          # Tailwind CSS 4 theme + imports
  env.ts                      # Environment variable validation (Zod)
prisma/
  schema.prisma               # Database schema (6 models)
  seed.ts                     # Seed data (243 species, 3 lodges, admin)
```

## Data Models

| Model | Purpose |
|-------|---------|
| **User** | Guide account with role and lodge assignment |
| **Lodge** | Camp location with GPS coordinates |
| **Species** | Wildlife catalogue (common name, scientific name, category, family) |
| **DriveSession** | Game drive with route (JSON array of GPS points), start/end times |
| **Sighting** | Individual wildlife observation linked to drive, species, and location |
| **ChecklistItem** | Per-user species tracking (spotted, count, first sighted date) |

## Lodges

All three camps are in the north-west sector of the Klaserie Private Nature Reserve, Greater Kruger:

| Camp | Latitude | Longitude |
|------|----------|-----------|
| Nzumba Camp | -24.1925 | 31.0742 |
| Last Word Kitara | -24.2048 | 31.0831 |
| Dundee Camp | -24.1812 | 31.0654 |
