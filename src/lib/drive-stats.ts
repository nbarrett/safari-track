interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface DriveStats {
  totalDistanceKm: number;
  durationMinutes: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  sightingsCount: number;
}

export function calculateDriveStats(
  route: GpsPoint[],
  sightingsCount: number,
): DriveStats {
  if (route.length < 2) {
    return {
      totalDistanceKm: 0,
      durationMinutes: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      sightingsCount,
    };
  }

  let totalDistance = 0;
  let maxSpeed = 0;

  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1]!;
    const curr = route[i]!;
    const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    totalDistance += dist;

    const timeDiff =
      (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
    if (timeDiff > 0) {
      const speedKmh = (dist / timeDiff) * 3.6;
      if (speedKmh > maxSpeed && speedKmh < 200) {
        maxSpeed = speedKmh;
      }
    }
  }

  const startTime = new Date(route[0]!.timestamp).getTime();
  const endTime = new Date(route[route.length - 1]!.timestamp).getTime();
  const durationMinutes = (endTime - startTime) / 60000;
  const durationHours = durationMinutes / 60;

  const totalDistanceKm = totalDistance / 1000;
  const avgSpeedKmh = durationHours > 0 ? totalDistanceKm / durationHours : 0;

  return {
    totalDistanceKm,
    durationMinutes,
    avgSpeedKmh,
    maxSpeedKmh: maxSpeed,
    sightingsCount,
  };
}
