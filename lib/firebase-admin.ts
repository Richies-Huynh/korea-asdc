import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let app: App | null = null;

function adminApp(): App {
  if (app)
    return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  // Env-stored private keys have literal "\n" sequences that must become newlines.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return app;
}

// Initialize the Admin SDK on first property access rather than at import, so a
// production build (which imports these modules without credentials present)
// does not fail while collecting page data.
function lazy<T extends object>(factory: () => T): T {
  let instance: T | null = null;
  return new Proxy({} as T, {
    get(_target, property, receiver) {
      instance ??= factory();
      const value = Reflect.get(instance as object, property, receiver);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const adminAuth = lazy(() => getAuth(adminApp()));
export const adminDb = lazy(() => getFirestore(adminApp()));
export const adminStorage = lazy(() => getStorage(adminApp()));
