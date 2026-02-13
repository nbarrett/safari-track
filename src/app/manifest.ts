import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Klaserie Camps",
    short_name: "Klaserie Camps",
    description: "GPS wildlife tracking for Klaserie Private Nature Reserve",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#6B4C2E",
    background_color: "#EDE4D9",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
