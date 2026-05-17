import * as admin from "firebase-admin";

function getAdminApp() {
  if (admin.apps.length) return admin.apps[0]!;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is missing");
  const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export { admin, getAdminApp };
