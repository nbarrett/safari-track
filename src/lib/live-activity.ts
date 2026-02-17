import { registerPlugin } from "@capacitor/core";
import { isIos } from "~/lib/native";

interface LiveActivityPlugin {
  startActivity(options: { driveName: string; startedAt: string }): Promise<void>;
  updateActivity(options: { distanceMetres: number; sightingCount: number }): Promise<void>;
  endActivity(): Promise<void>;
}

const LiveActivity = registerPlugin<LiveActivityPlugin>("LiveActivity");

export function startLiveActivity(driveName: string, startedAt: string): void {
  if (!isIos()) return;
  void LiveActivity.startActivity({ driveName, startedAt }).catch((err: unknown) => {
    console.error("[LiveActivity] startActivity failed", err);
  });
}

export function updateLiveActivity(distanceMetres: number, sightingCount: number): void {
  if (!isIos()) return;
  void LiveActivity.updateActivity({ distanceMetres, sightingCount }).catch((err: unknown) => {
    console.error("[LiveActivity] updateActivity failed", err);
  });
}

export function endLiveActivity(): void {
  if (!isIos()) return;
  void LiveActivity.endActivity().catch((err: unknown) => {
    console.error("[LiveActivity] endActivity failed", err);
  });
}
