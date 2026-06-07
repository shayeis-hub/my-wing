import { admin, getAdminApp } from "@/lib/firebase/admin";

/**
 * Verify the Firebase ID token from the Authorization header and return the
 * authenticated uid. Returns null if missing/invalid.
 *
 * Use this for privileged actions instead of trusting a uid passed in the
 * request body (which any client could spoof).
 */
export async function getUidFromRequest(req: Request): Promise<string | null> {
  try {
    const header = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    getAdminApp();
    const decoded = await admin.auth().verifyIdToken(match[1].trim());
    return decoded.uid || null;
  } catch {
    return null;
  }
}
