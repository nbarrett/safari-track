export type InstallScenario = "android" | "ios-safari" | "ios-non-safari";

export const MANIFEST_VERSION = 1;

const DISMISS_PREFIX = "install-prompt-dismissed-";
const DISMISS_DAYS = 14;
const VERSION_KEY = "install-prompt-manifest-version";

function isIos(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    ("standalone" in navigator &&
      (navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return (
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|OPiOS|EdgiOS|BraveIO/.test(ua) &&
    !/Chrome/.test(ua)
  );
}

export function detectInstallScenario(): InstallScenario | null {
  if (typeof navigator === "undefined") return null;
  if (isStandalone()) return null;

  if (isIos()) {
    return isIosSafari() ? "ios-safari" : "ios-non-safari";
  }

  return "android";
}

export function isDismissed(scenario: InstallScenario): boolean {
  const raw = localStorage.getItem(DISMISS_PREFIX + scenario);
  if (!raw) return false;
  const expiry = Number(raw);
  if (Number.isNaN(expiry) || Date.now() > expiry) {
    localStorage.removeItem(DISMISS_PREFIX + scenario);
    return false;
  }
  return true;
}

export function setDismissed(scenario: InstallScenario): void {
  const expiry = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(DISMISS_PREFIX + scenario, String(expiry));
}

export function isAppStale(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!isStandalone()) return false;
  const stored = localStorage.getItem(VERSION_KEY);
  if (!stored) return false;
  return Number(stored) !== MANIFEST_VERSION;
}

export function markVersionSeen(): void {
  localStorage.setItem(VERSION_KEY, String(MANIFEST_VERSION));
}
