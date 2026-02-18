import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.safaritrack.app",
  appName: "Safari Track",
  webDir: "out",
  server: {
    url: "https://safaritrack.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    useLegacyBridge: true,
  },
  plugins: {},
};

export default config;
