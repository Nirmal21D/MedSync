// lib/firebase.ts
/**
 * Firebase bootstrap.
 *
 * When the environment variables are **not** present we return a disabled
 * Firebase instance so the rest of the app keeps working in local previews.
 *
 * To connect MedSync to your own Firebase project add the variables shown
 * below to `.env.local` (all **NEXT_PUBLIC_*** so they are available
 * in the browser bundle):
 *
 *  NEXT_PUBLIC_FIREBASE_API_KEY=...
 *  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
 *  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
 *  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
 *  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
 *  NEXT_PUBLIC_FIREBASE_APP_ID=...
 */

import { initializeApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

export let app: FirebaseApp | undefined
export let auth: Auth | undefined
export let db: Firestore | undefined

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const isConfigValid = Object.values(firebaseConfig).every(Boolean)

if (isConfigValid) {
  // ✅ Real Firebase project
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} else {
  // 🚧 No credentials – create stubs so the UI won’t crash
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[MedSync] Firebase environment variables are missing. " +
        "Auth & Firestore features are disabled in this preview.",
    )
  }
  // @ts-expect-error – we purposely leave these undefined in preview mode
  app = auth = db = undefined
}
