import { auth } from "@/lib/firebase/config";

/** POST JSON with the signed-in user's Firebase ID token (for routes that verify identity server-side). */
export async function postAuthed(url: string, body: unknown): Promise<Response> {
  const token = await auth.currentUser?.getIdToken().catch(() => undefined);
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}
