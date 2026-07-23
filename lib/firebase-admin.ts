import { applicationDefault, cert, getApps, initializeApp, type App, type Credential } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let app: App | null = null;

// Local dev supplies an explicit service-account key via env. Firebase App
// Hosting (production) does not: its backend runs on Cloud Run with a service
// account, so Application Default Credentials are available automatically. Fall
// back to ADC when the explicit key is absent instead of passing undefined
// fields into cert(), which throws and 500s every server request.
// Normalize a service-account private key stored in an env var. dotenv strips
// surrounding quotes locally, but Cloud Run / App Hosting keeps them as part of
// the value, which corrupts the PEM and makes cert() throw. Strip the quotes and
// turn literal "\n" sequences back into real newlines.
function privateKeyFromEnv(): string | undefined {
  let key = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();
  if (!key)
    return undefined;
  if (key.length >= 2 && ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))))
    key = key.slice(1, -1);
  return key.replace(/\\n/g, "\n");
}

function adminCredential(): Credential {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = privateKeyFromEnv();
  if (projectId && clientEmail && privateKey)
    return cert({ projectId, clientEmail, privateKey });
  return applicationDefault();
}

function adminApp(): App {
  if (app)
    return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  app = initializeApp({
    credential: adminCredential(),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
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
