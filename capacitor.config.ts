import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:    "app.wingpact.native",
  appName:  "מבנה כנף",
  // Load the live site — always up to date, no export needed
  server: {
    url:             "https://wingpact.app",
    cleartext:       false,
    allowNavigation: ["wingpact.app", "*.wingpact.app", "accounts.google.com", "*.googleapis.com", "*.paypal.com"],
  },
  android: {
    allowMixedContent:   false,
    captureInput:        true,
    webContentsDebuggingEnabled: false,
    backgroundColor:     "#fbf4e6",
    overrideUserAgent:   "MabneKanaf/1.0 Android",
  },
  ios: {
    contentInset:    "automatic",
    backgroundColor: "#fbf4e6",
    overrideUserAgent: "MabneKanaf/1.0 iOS",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration:  2000,
      backgroundColor:     "#fbf4e6",
      showSpinner:         false,
      androidScaleType:    "CENTER_CROP",
    },
    StatusBar: {
      style:           "DARK",
      backgroundColor: "#fbf4e6",
    },
  },
};

export default config;
