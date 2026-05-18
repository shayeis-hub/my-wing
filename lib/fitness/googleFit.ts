import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  linkWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";

const FITNESS_SCOPE = "https://www.googleapis.com/auth/fitness.activity.read";

export async function syncGoogleFitSteps(currentUser: FirebaseUser): Promise<number> {
  const provider = new GoogleAuthProvider();
  provider.addScope(FITNESS_SCOPE);

  const hasGoogle = currentUser.providerData.some((p) => p.providerId === "google.com");

  let accessToken: string | null | undefined;

  if (hasGoogle) {
    const result = await reauthenticateWithPopup(currentUser, provider);
    accessToken = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  } else {
    const result = await linkWithPopup(currentUser, provider);
    accessToken = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  }

  if (!accessToken) throw new Error("לא ניתן לקבל גישה ל-Google Fit");

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
  for (const bucket of (data.bucket ?? [])) {
    for (const dataset of (bucket.dataset ?? [])) {
      for (const point of (dataset.point ?? [])) {
        for (const value of (point.value ?? [])) {
          totalSteps += value.intVal ?? 0;
        }
      }
    }
  }

  return totalSteps;
}
