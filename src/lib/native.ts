interface CapacitorGlobal {
  isNativePlatform: () => boolean;
  getPlatform: () => string;
}

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { Capacitor?: CapacitorGlobal };
  return win.Capacitor ?? null;
}

export function isNative(): boolean {
  return getCapacitor()?.isNativePlatform() === true;
}

export function isIos(): boolean {
  return isNative() && getCapacitor()?.getPlatform() === "ios";
}

export function isAndroid(): boolean {
  return isNative() && getCapacitor()?.getPlatform() === "android";
}
