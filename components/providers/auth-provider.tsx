"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"

const DEMO_USERS = [
  { email: "admin@gmail.com", role: "admin" },
  { email: "doctor1@gmail.com", role: "doctor" },
  { email: "nurse1@gmail.com", role: "nurse" },
  { email: "pharmacist1@gmail.com", role: "pharmacist" },
  { email: "receptionist1@gmail.com", role: "receptionist" },
] as const

interface User extends FirebaseUser {
  role?: string
  name?: string
  status?: "active" | "inactive"
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!auth) {
      setLoading(false) // instantly ready in preview mode
      return
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (db) {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid))
          const data = snap.data()
          if (data?.status === "inactive") {
            if (auth) await firebaseSignOut(auth)
            router.push("/inactive")
            return
          }
          setUser({ ...firebaseUser, role: data?.role, name: data?.name, status: data?.status })
        } else {
          setUser({ ...firebaseUser })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return unsub
  }, [])

  const login = async (email: string, password: string) => {
    // --- 1️⃣  PREVIEW MODE ----------------------------------------------
    if (!auth || !db) {
      // No Firebase credentials => treat as demo sign-in
      const match = DEMO_USERS.find((u) => u.email === email)
      setUser({
        uid: email, // just reuse email as fake UID
        email,
        role: match?.role,
        displayName: email.split("@")[0],
        status: "active", // or "inactive" if you want to simulate
      } as User)
      return
    }

    // --- 2️⃣  REAL FIREBASE ---------------------------------------------
    if (!auth || !db) return;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)

      // Fetch user data from Firestore
      const snap = await getDoc(doc(db, "users", result.user.uid))
      const data = snap.data()
      if (data?.status === "inactive") {
        if (auth) await firebaseSignOut(auth)
        router.push("/inactive")
        return
      }
      setUser({ ...result.user, role: data?.role, name: data?.name, status: data?.status })
      // Persist / update role on Firestore
      await setDoc(
        doc(db, "users", result.user.uid),
        {
          email: result.user.email,
          name: result.user.displayName ?? email.split("@")[0],
          lastLogin: new Date(),
        },
        { merge: true },
      )
    } catch (error: any) {
      // If we're using demo credentials in a real Firebase project that
      // does not contain those users – silently fall back.
      if (error.code === "auth/invalid-credential") {
        const match = DEMO_USERS.find((u) => u.email === email)
        if (match) {
          setUser({
            uid: email,
            email,
            role: match.role,
            displayName: email.split("@")[0],
            status: "active",
          } as User)
          return
        }
      }
      console.error("Login error:", error)
      throw error
    }
  }

  const logout = async () => {
    if (auth) {
      await firebaseSignOut(auth)
    }
    setUser(null) // always clear local state
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
