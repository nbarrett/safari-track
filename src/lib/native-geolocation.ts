import { BackgroundGeolocation } from "@capgo/background-geolocation";

interface NativeGeoPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export async function startNativeGeolocation(
  onPoint: (point: NativeGeoPoint) => void,
  onError: (message: string) => void,
): Promise<void> {
  await BackgroundGeolocation.start(
    {
      backgroundMessage: "Drive in progress",
      backgroundTitle: "Safari Track",
      distanceFilter: 5,
      stale: false,
      requestPermissions: true,
    },
    (position, error) => {
      if (error) {
        if (error.code === "NOT_AUTHORIZED") {
          onError("Location permission denied");
        }
        return;
      }
      if (!position) return;

      onPoint({
        lat: position.latitude,
        lng: position.longitude,
        timestamp: position.time
          ? new Date(position.time).toISOString()
          : new Date().toISOString(),
      });
    },
  );
}

export async function stopNativeGeolocation(): Promise<void> {
  await BackgroundGeolocation.stop();
}
