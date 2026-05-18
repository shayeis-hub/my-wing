export function connectGoogleFit(uid: string) {
  window.location.href = `/api/fitness/auth?uid=${uid}`;
}

export async function fetchStepsFromServer(
  uid: string
): Promise<{ connected: boolean; steps: number | null }> {
  const res = await fetch(`/api/fitness/steps?uid=${uid}`);
  if (!res.ok) return { connected: false, steps: null };
  return res.json();
}
