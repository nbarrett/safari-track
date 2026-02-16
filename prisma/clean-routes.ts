import type { InputJsonValue } from "../generated/prisma/runtime/library";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const R = 6_371_000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  [key: string]: unknown;
}

const MAX_SPEED_MS = 33;
const NEAR_START_THRESHOLD_M = 200;

function toRoutePoints(raw: unknown[]): RoutePoint[] {
  return raw.filter(
    (p): p is RoutePoint =>
      p !== null &&
      typeof p === "object" &&
      !Array.isArray(p) &&
      "lat" in p &&
      "lng" in p &&
      "timestamp" in p,
  );
}

async function main() {
  const drives = await prisma.driveSession.findMany({
    where: { endedAt: { not: null } },
    select: { id: true, route: true, startedAt: true },
  });

  console.log(`Found ${drives.length} completed drives to check`);

  let drivesFixed = 0;
  let totalPointsRemoved = 0;

  for (const drive of drives) {
    const route = toRoutePoints(drive.route ?? []);

    if (route.length < 3) continue;

    const start = route[0]!;
    const segments: RoutePoint[][] = [[route[0]!]];

    for (let i = 1; i < route.length; i++) {
      const prev = route[i - 1]!;
      const curr = route[i]!;
      const dist = haversineMetres(prev.lat, prev.lng, curr.lat, curr.lng);
      const dt =
        (new Date(curr.timestamp).getTime() -
          new Date(prev.timestamp).getTime()) /
        1000;
      const speed = dt > 0 ? dist / dt : Infinity;

      if (speed > MAX_SPEED_MS) {
        segments.push([curr]);
      } else {
        segments[segments.length - 1]!.push(curr);
      }
    }

    const kept = segments.filter((segment, idx) => {
      if (idx === 0) return true;
      return !segment.every(
        (p) =>
          haversineMetres(start.lat, start.lng, p.lat, p.lng) <
          NEAR_START_THRESHOLD_M,
      );
    });

    const cleanedRoute = kept.flat();
    const removed = route.length - cleanedRoute.length;

    if (removed > 0) {
      console.log(
        `  Drive ${drive.id} (${drive.startedAt.toISOString().slice(0, 10)}): ${route.length} pts -> ${cleanedRoute.length} pts (removed ${removed})`,
      );
      await prisma.driveSession.update({
        where: { id: drive.id },
        data: { route: cleanedRoute as unknown as InputJsonValue[] },
      });
      drivesFixed++;
      totalPointsRemoved += removed;
    }
  }

  console.log(
    `\nDone: ${drivesFixed} drives fixed, ${totalPointsRemoved} bogus points removed`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
