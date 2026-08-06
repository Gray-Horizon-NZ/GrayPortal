import "server-only";
import { initializeApp, getApps, cert, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

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

// Documents are never served via public Firebase Storage security rules —
// every download is minted as a short-lived v4 signed URL from a Next.js
// route that has already re-checked the caller's session and RLS-backed
// access to the document row (Phase 2 brief §4: "confirm access rules
// actually enforce this at the storage layer, not just via the DB query").
// Requiring FIREBASE_STORAGE_BUCKET explicitly rather than guessing the
// default bucket name avoids silently writing to the wrong bucket.
export function adminBucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error("FIREBASE_STORAGE_BUCKET is not configured");
  }
  return getStorage(adminApp).bucket(bucketName);
}
