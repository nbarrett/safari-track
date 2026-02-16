export const APP_VERSION = "1.7.7";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.7.7",
    date: "16 Feb 2026",
    title: "Bug fixes",
    changes: [
      "Robust safe-area padding and drive detail layout polish",
    ],
  },
  {
    version: "1.7.6",
    date: "16 Feb 2026",
    title: "Bug fixes",
    changes: [
      "Stat badges in single-row grid, more padding before map",
    ],
  },
  {
    version: "1.7.5",
    date: "16 Feb 2026",
    title: "Bug fixes",
    changes: [
      "Increase vertical padding on drive detail page",
    ],
  },
  {
    version: "1.7.4",
    date: "16 Feb 2026",
    title: "Bug fixes",
    changes: [
      "Drive detail sighting cards with species thumbnails and better UX",
    ],
  },
  {
    version: "1.7.3",
    date: "16 Feb 2026",
    title: "Bug fixes",
    changes: [
      "SSR safe-area spacer and install prompt with actionable button",
    ],
  },
  {
    version: "1.7.2",
    date: "16 Feb 2026",
    title: "Bug fixes",
    changes: [
      "Drive detail header colliding with phone status bar",
    ],
  },
  {
    version: "1.7.1",
    date: "16 Feb 2026",
    title: "Bug fixes",
    changes: [
      "Species selector UX, nav hydration, notification removal, and misc fixes",
    ],
  },
  {
    version: "1.7.0",
    date: "16 Feb 2026",
    title: "New features and fixes",
    changes: [
      "Extract EXIF date/location from photos for backdated sightings",
      "Nav hydration mismatch between server and client",
    ],
  },
  {
    version: "1.6.0",
    date: "16 Feb 2026",
    title: "New features and fixes",
    changes: [
      "Show alternative species in detection results",
      "Add paste-from-clipboard option in photo capture modal",
      "Drive history header buttons overlapping burger menu",
      "Photo sightings now update drive panel counts and trip state",
      "Surface AI detection errors in photo capture UI",
    ],
  },
  {
    version: "1.5.0",
    date: "16 Feb 2026",
    title: "Route tracking and layout fixes",
    changes: [
      "Direction arrow now visible on the map showing which way you're heading",
      "Drive route stays connected during stops with dashed lines for gaps",
      "Fixed inflated distance readings caused by GPS jumps when the phone wakes up",
      "Reduced right-side padding on all pages for a cleaner mobile layout",
      "Drive history no longer collides with the phone status bar",
    ],
  },
  {
    version: "1.4.0",
    date: "16 Feb 2026",
    title: "Creepy Crawlies and data cleanup",
    changes: [
      "New species category: Creepy Crawlies (Millipede, Orb Spider, Velvet Mite)",
      "Cleaned up old drive routes that had stray lines jumping back to camp",
      "History page no longer hides behind the top of the screen on iPhone",
      "Drive detail now fills the whole screen properly on every device",
    ],
  },
  {
    version: "1.3.0",
    date: "16 Feb 2026",
    title: "Better maps and points of interest",
    changes: [
      "Route line now shows a colour gradient based on speed, similar to Strava",
      "Arrow indicator shows your direction of travel on the map",
      "You can switch between satellite, terrain, and street map views",
      "Add and view points of interest (POI) on the map with custom names and icons",
      "Map resizes with the app and has proper spacing around drive controls",
    ],
  },
  {
    version: "1.2.0",
    date: "16 Feb 2026",
    title: "Sighting improvements",
    changes: [
      "See which category each species belongs to in the sighting popup",
      "Confirmation prompt when removing a sighting to prevent accidents",
      "New \"Heard only\" option when you hear but don't see an animal",
      "Species count shown on the sightings summary panel",
    ],
  },
  {
    version: "1.1.0",
    date: "16 Feb 2026",
    title: "Compass and bug fixes",
    changes: [
      "Compass now shows N, E, S, W labels so you always know which way you're facing",
      "Fixed the problem where a straight line was drawn back to camp when switching apps",
      "Zooming the species popup no longer locks the map zoom level",
      "You can now properly decrease the sighting count during a drive",
      "Pinch-to-zoom is now restricted to the map only, not the whole page",
    ],
  },
  {
    version: "1.0.0",
    date: "15 Feb 2026",
    title: "First field release",
    changes: [
      "GPS-tracked game drives with live route recording",
      "Quick sighting logger with 240+ species across Mammals, Birds, and Reptiles",
      "Personal checklist to track which species you've spotted",
      "Drive history with map playback and flythrough mode",
      "Works offline in the bush and syncs when back in range",
      "Multi-select and delete old drives from history",
      "Strava integration to export your drives",
      "Compass for navigation in the field",
    ],
  },
  {
    version: "0.9.0",
    date: "14 Feb 2026",
    title: "Polished drive experience",
    changes: [
      "Redesigned drive controls inspired by Strava's clean look",
      "Live GPS position marker so you can see yourself on the map",
      "Auto-pause when you stop moving, auto-resume when you start again",
      "Save or discard a drive when you're done",
      "Back button on drive detail and better checklist filtering",
    ],
  },
  {
    version: "0.8.0",
    date: "13 Feb 2026",
    title: "Offline mode and photo gallery",
    changes: [
      "App now works fully offline — your drives and sightings are saved locally and sync when you're back in range",
      "Sync indicator shows when data is being uploaded",
      "Photos fall back gracefully when you're off the grid",
      "Enhanced drive detail with photo markers on the map, stats, and a timeline",
    ],
  },
  {
    version: "0.7.0",
    date: "12 Feb 2026",
    title: "Profile and lodge branding",
    changes: [
      "New profile page where you can see your stats and change settings",
      "Drive distance shown in your preferred unit (km or miles)",
      "Lodge branding throughout the app",
      "Beautiful wildlife photo backdrops that cycle on every page",
      "Redesigned logo and refreshed look across the board",
    ],
  },
  {
    version: "0.6.0",
    date: "11 Feb 2026",
    title: "Registration and species management",
    changes: [
      "New guide registration so your team can create their own accounts",
      "Guest browsing — visitors can explore the species checklist without signing in",
      "Admin species management page for adding and editing species",
      "Session caching so the app opens instantly, even offline",
    ],
  },
  {
    version: "0.5.0",
    date: "10 Feb 2026",
    title: "Strava and GPX import",
    changes: [
      "Connect your Strava account to export game drives as activities",
      "Admin page to configure Strava credentials for your lodge",
      "Import GPX files from other GPS devices into your drive history",
      "Road overlay on the map uploaded by your lodge admin",
    ],
  },
  {
    version: "0.4.0",
    date: "9 Feb 2026",
    title: "Quick sighting panel",
    changes: [
      "Tap to log a sighting instantly during a drive — no more navigating away",
      "Browse all species while on a drive, filtered by category",
      "Trip summary tracks your sightings across the whole day",
      "Smoother loading screen when opening the app",
    ],
  },
  {
    version: "0.3.0",
    date: "8 Feb 2026",
    title: "Scrollable checklist and lodge pages",
    changes: [
      "Full species checklist with 240+ animals, birds, and reptiles",
      "Lodge showcase pages with location and details",
      "Compact drive controls that stay out of the way",
      "Sticky navigation bar on every page",
    ],
  },
  {
    version: "0.2.0",
    date: "7 Feb 2026",
    title: "Rich UI and responsive design",
    changes: [
      "Cycling wildlife backdrop photos across the app",
      "Responsive layouts that work on phones, tablets, and desktops",
      "Guest access to the species checklist without needing an account",
      "Rebranded from Klaserie Camps to Safari Track",
    ],
  },
  {
    version: "0.1.0",
    date: "6 Feb 2026",
    title: "The very beginning",
    changes: [
      "Basic game drive recording with GPS tracking",
      "Species database seeded with South African wildlife",
      "Sign in with email and password",
      "Deployed to Fly.io for the first time",
    ],
  },
];
