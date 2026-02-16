import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Safari Track",
    short_name: "Safari Track",
    description: "GPS-tracked game drives and wildlife sighting logs",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#6B4C2E",
    background_color: "#EDE4D9",
    categories: ["travel", "navigation", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Start Drive",
        short_name: "Drive",
        url: "/drive",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Species Checklist",
        short_name: "Checklist",
        url: "/checklist",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Drive History",
        short_name: "History",
        url: "/drives",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
