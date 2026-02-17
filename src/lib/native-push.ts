import { PushNotifications } from "@capacitor/push-notifications";

export async function registerNativePush(): Promise<string | null> {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return null;

  return new Promise((resolve) => {
    void PushNotifications.addListener("registration", (token) => {
      resolve(token.value);
    });
    void PushNotifications.addListener("registrationError", () => {
      resolve(null);
    });
    void PushNotifications.register();
  });
}
