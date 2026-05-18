import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  linkWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";

const FITNESS_SCOPE = "https://www.googleapis.com/auth/fitness.activity.read";
const LS_KEY = "googleFitConnected";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (r: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

async function fetchStepsWithToken(accessToken: string): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 86400000;

  const res = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startOfDay,
        endTimeMillis: endOfDay,
      }),
    }
  );

  if (!res.ok) throw new Error(`Google Fit: ${res.status}`);

  const data = await res.json();
  let totalSteps = 0;
  for (const bucket of data.bucket ?? []) {
    for (const dataset of bucket.dataset ?? []) {
      for (const point of dataset.point ?? []) {
        for (const value of point.value ?? []) {
          totalSteps += value.intVal ?? 0;
        }
      }
    }
  }
  return totalSteps;
}

// First-time auth via Firebase popup — also marks user as connected
export async function syncGoogleFitSteps(currentUser: FirebaseUser): Promise<number> {
  const provider = new GoogleAuthProvider();
  provider.addScope(FITNESS_SCOPE);

  const hasGoogle = currentUser.providerData.some((p) => p.providerId === "google.com");
  const result = hasGoogle
    ? await reauthenticateWithPopup(currentUser, provider)
    : await linkWithPopup(currentUser, provider);

  const accessToken = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!accessToken) throw new Error("לא ניתן לקבל גישה ל-Google Fit");

  const steps = await fetchStepsWithToken(accessToken);
  localStorage.setItem(LS_KEY, "true");
  return steps;
}

// Silent auto-sync using Google Identity Services (no popup if already authorized)
export function autoSyncGoogleFitSteps(): Promise<number | null> {
  return new Promise((resolve) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.oauth2) {
      resolve(null);
      return;
    }

    let resolved = false;
    const done = (val: number | null) => {
      if (!resolved) { resolved = true; resolve(val); }
    };

    // Timeout — if GIS doesn't respond in 6s, give up silently
    setTimeout(() => done(null), 6000);

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: FITNESS_SCOPE,
      prompt: "",
      callback: async (response) => {
        if (response.error || !response.access_token) { done(null); return; }
        try {
          done(await fetchStepsWithToken(response.access_token));
        } catch {
          done(null);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: "" });
  });
}

export function wasGoogleFitConnected(): boolean {
  return typeof localStorage !== "undefined" && localStorage.getItem(LS_KEY) === "true";
}
