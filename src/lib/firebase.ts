
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

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let analytics: Analytics | null = null;

if (!firebaseConfig.apiKey) {
  console.error(
    'Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing from environment variables. Please check your .env file.'
  );
} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Error initializing Firebase app:", error);
      // If initializeApp fails, 'app' will remain undefined.
    }
  } else {
    app = getApps()[0];
  }

  if (app) {
    try {
        auth = getAuth(app); // Only call getAuth if app is defined
    } catch (error) {
        console.error("Error initializing Firebase Auth:", error);
        // If getAuth fails, 'auth' will remain undefined.
    }

    if (typeof window !== 'undefined') { // Analytics is client-side
      if (firebaseConfig.measurementId) {
        try {
          analytics = getAnalytics(app);
        } catch (error) {
          console.error("Error initializing Firebase Analytics:", error);
        }
      } else {
        // console.warn("Firebase Measurement ID (NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) is missing. Analytics will not be initialized.");
      }
    }
  } else {
    console.error("Firebase app initialization failed or API key is invalid. Auth and Analytics will not be available.");
  }
}

export { app, auth, analytics };
