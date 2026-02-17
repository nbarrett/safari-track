import { isNative } from "~/lib/native";

const TAG = "safari-track-drive";

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative()) return true;
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function showDriveNotification(elapsed: string, distance: string) {
  if (isNative()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const reg = await navigator.serviceWorker?.ready;
  if (reg) {
    await reg.showNotification("Safari Track — Drive in progress", {
      body: `${elapsed}  •  ${distance}`,
      tag: TAG,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      silent: true,
      requireInteraction: true,
      data: { url: "/drive" },
      renotify: true,
    } as NotificationOptions & { renotify: boolean });
  }
}

export async function clearDriveNotification() {
  if (isNative()) return;
  const reg = await navigator.serviceWorker?.ready;
  if (!reg) return;
  const notifications = await reg.getNotifications({ tag: TAG });
  notifications.forEach((n) => n.close());
}
