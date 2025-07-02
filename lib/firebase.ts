

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

  app = auth = db = undefined
}
