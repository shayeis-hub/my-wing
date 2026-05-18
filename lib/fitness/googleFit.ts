import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  linkWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";

const FITNESS_SCOPE = "https://www.googleapis.com/auth/fitness.activity.read";
const LS_KEY = "googleFitToken";

interface StoredToken {
  token: string;
  expiry: number; // ms timestamp
}

function saveToken(token: string) {
  const stored: StoredToken = { token, expiry: Date.now() + 55 * 60 * 1000 }; // 55 min
  localStorage.setItem(LS_KEY, JSON.stringify(stored));
}

function loadToken(): string | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const stored: StoredToken = JSON.parse(raw);
    if (Date.now() > stored.expiry) { localStorage.removeItem(LS_KEY); return null; }
    return stored.token;
  } catch {
    return null;
  }
}

export async function fetchStepsWithToken(accessToken: string): Promise<number> {
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

// Manual first-time auth via Firebase popup — saves token for auto-reuse
export async function syncGoogleFitSteps(currentUser: FirebaseUser): Promise<number> {
  const provider = new GoogleAuthProvider();
  provider.addScope(FITNESS_SCOPE);

  const hasGoogle = currentUser.providerData.some((p) => p.providerId === "google.com");
  const result = hasGoogle
    ? await reauthenticateWithPopup(currentUser, provider)
    : await linkWithPopup(currentUser, provider);

  const accessToken = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!accessToken) throw new Error("לא ניתן לקבל גישה ל-Google Fit");

  saveToken(accessToken);
  return fetchStepsWithToken(accessToken);
}

// Auto-sync using stored token — no popup, fails silently if expired
export async function autoSyncGoogleFitSteps(): Promise<number | null> {
  const token = loadToken();
  if (!token) return null;
  try {
    return await fetchStepsWithToken(token);
  } catch {
    localStorage.removeItem(LS_KEY);
    return null;
  }
}

export function hasStoredGoogleFitToken(): boolean {
  return loadToken() !== null;
}
