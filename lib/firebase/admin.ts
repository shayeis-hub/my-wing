import * as admin from "firebase-admin";

function getAdminApp() {
  if (admin.apps.length) return admin.apps[0]!;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is missing");

  let serviceAccount: admin.ServiceAccount & { private_key?: string };
  try {
    // Strip UTF-8 BOM if present (added by Windows Notepad / some editors)
    serviceAccount = JSON.parse(raw.replace(/^﻿/, "").trim());
  } catch {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${raw.slice(0, 80)}`);
  }

  // Vercel stores env vars with literal \n instead of real newlines — fix it
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export { admin, getAdminApp };
