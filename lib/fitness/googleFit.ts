export function connectGoogleFit(uid: string) {
  window.location.href = `/api/fitness/auth?uid=${uid}`;
}

export async function fetchStepsFromServer(
  uid: string
): Promise<{ connected: boolean; steps: number | null }> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;
  const res = await fetch(`/api/fitness/steps?uid=${uid}&start=${start}&end=${end}`);
  if (!res.ok) return { connected: false, steps: null };
  return res.json();
}
