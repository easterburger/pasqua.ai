
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;

if (!firebaseConfig.apiKey) {
  console.error(
    'Firebase API Key is missing. Please check your .env file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set correctly.'
  );
  // You might want to throw an error here or handle this case differently
  // depending on how critical Firebase is to your app's startup.
  // For now, we'll let it proceed so Firebase can throw its own specific error,
  // but this log helps identify if the env var is the root cause.
}

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Error initializing Firebase app:", error);
    // It's possible that even with a seemingly valid apiKey, other config issues might arise.
    // Re-throw or handle as appropriate for your application.
    // For now, if initializeApp fails, 'app' will be undefined, caught by subsequent 'getAuth' or 'getAnalytics'.
    // A more robust solution might be to prevent further execution if app initialization fails.
    // However, the original error points to the API key during "Create Installation request".
  }
} else {
  app = getApps()[0];
}

// @ts-ignore app might be undefined if initializeApp failed and wasn't handled by throwing
const auth: Auth = getAuth(app); 
let analytics: Analytics | null = null;

if (typeof window !== 'undefined' && app!) { // Check if app was initialized
  // Ensure Firebase app is initialized and getAnalytics function is available
  // This is primarily to ensure it runs only on the client side.
  if (firebaseConfig.apiKey && firebaseConfig.measurementId) { // Analytics requires measurementId
      try {
        analytics = getAnalytics(app);
      } catch (error) {
        console.error("Error initializing Firebase Analytics:", error);
      }
  }
}

export { app, auth, analytics };
