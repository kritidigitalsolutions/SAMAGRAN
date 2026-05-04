import admin from "firebase-admin";

let bucket = null;

const hasFirebaseCredentials =
  Boolean(process.env.FIREBASE_PROJECT_ID) &&
  Boolean(process.env.FIREBASE_PRIVATE_KEY_ID) &&
  Boolean(process.env.FIREBASE_PRIVATE_KEY) &&
  Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
  Boolean(process.env.FIREBASE_CLIENT_ID);

const hasFirebaseStorageBucket = Boolean(process.env.FIREBASE_STORAGE_BUCKET);

if (hasFirebaseCredentials) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CERT_URL,
      universe_domain: "googleapis.com",
    };

    if (!admin.apps.length) {
      const appOptions = {
        credential: admin.credential.cert(serviceAccount),
      };

      if (hasFirebaseStorageBucket) {
        appOptions.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
      }

      admin.initializeApp(appOptions);
    }

    if (hasFirebaseStorageBucket) {
      bucket = admin.storage().bucket();
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error.message);
  }
} else {
  console.warn("Firebase env vars are missing. Firebase uploads and messaging will be unavailable.");
}

export const firebaseAdmin = admin;
export const firebaseBucket = bucket;
export const isFirebaseReady = Boolean(bucket);
export const isFirebaseMessagingReady = Boolean(admin.apps.length);

export default bucket;
