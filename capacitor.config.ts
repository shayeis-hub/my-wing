import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Capacitor only reads this at `cap add <platform>` time to seed the new
  // native project's identifier — each platform's own project file
  // (android/app/build.gradle's applicationId, ios's PRODUCT_BUNDLE_IDENTIFIER)
  // is the real source of truth afterward, so changing this does not affect
  // the already-published, already-locked-in Android app.
  appId:    "app.wingpact.ios",
  appName:  "Wingpact",
  // Load the live site — always up to date, no export needed.
  // Start at /dashboard so the AuthGuard routes to /login when not signed in,
  // skipping the public marketing landing page.
  server: {
    url:             "https://wingpact.app/dashboard",
    cleartext:       false,
    allowNavigation: ["wingpact.app", "*.wingpact.app", "accounts.google.com", "*.googleapis.com", "*.paypal.com"],
  },
  android: {
    allowMixedContent:   false,
    captureInput:        false,
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
    FirebaseAuthentication: {
      // We keep using the Firebase JS SDK for auth state (Firestore reads rely
      // on it), so the native plugin only fetches the Google credential and we
      // sign into the JS SDK ourselves with signInWithCredential.
      skipNativeAuth: true,
      providers: ["google.com"],
    },
  },
};

export default config;
