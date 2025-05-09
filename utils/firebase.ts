// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously, Auth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

// Check if configuration has actual values
const hasValidConfig = Object.values(firebaseConfig).every(value => 
  value && !value.includes("YOUR_")
);

// Initialize Firebase
let app: FirebaseApp | null = null;
let storage: FirebaseStorage | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;

try {
  app = initializeApp(firebaseConfig);
  storage = getStorage(app);
  firestore = getFirestore(app);
  auth = getAuth(app);
  
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// Sign in anonymously to Firebase
export const signInAnonymousUser = async (): Promise<void> => {
  if (!hasValidConfig || !auth) {
    console.warn("Firebase not properly configured. Skipping authentication.");
    return;

    
  }
  
  try {
    await signInAnonymously(auth);
    console.log("Signed in anonymously to Firebase");
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    // Continue without authentication - storage might still work if rules allow public access
  }
};



export { app, storage, firestore, auth };
export default app; 