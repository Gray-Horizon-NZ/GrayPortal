import "server-only";
import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Local dev: explicit service account via env vars (FIREBASE_ADMIN_*).
// Deployed on Firebase App Hosting / Cloud Run: ambient credentials from
// the attached service account — no key file needed or committed.
function buildAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return initializeApp({ credential: applicationDefault() });
}

export const adminApp = buildAdminApp();
export const adminAuth = getAuth(adminApp);
