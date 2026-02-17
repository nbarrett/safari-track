import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.safaritrack.app",
  appName: "Safari Track",
  webDir: "out",
  server: {
    url: "https://safari-track.fly.dev",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    useLegacyBridge: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
