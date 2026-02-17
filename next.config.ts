import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import path from "node:path";
import withSerwistInit from "@serwist/next";

import "./src/env.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/offline.html", revision: "2" }],
});

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "safari-track.fly.dev",
      },
    ],
  },
};

export default withSerwist(config);
