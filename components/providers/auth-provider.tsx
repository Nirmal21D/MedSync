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
  { email: "patient@gmail.com", role: "patient" },
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
  }, [router])

  const login = async (email: string, password: string) => {
    // --- 1️⃣  PREVIEW MODE (No Firebase credentials) -------------------
    if (!auth || !db) {
      const match = DEMO_USERS.find((u) => u.email === email)
      if (!match) {
        throw new Error("Invalid credentials")
      }
      
      setUser({
        uid: email,
        email,
        role: match.role,
        displayName: match.role.charAt(0).toUpperCase() + match.role.slice(1),
        name: match.role.charAt(0).toUpperCase() + match.role.slice(1) + " Demo",
        status: "active",
      } as User)
      
      // Redirect based on role
      if (match.role === "patient") {
        router.push("/dashboard/patient")
      } else {
        router.push(`/dashboard/${match.role}`)
      }
      return
    }

    // --- 2️⃣  REAL FIREBASE MODE (With credentials) --------------------
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", result.user.uid))
      const userData = userDoc.data()
      
      // Check if user is inactive
      if (userData?.status === "inactive") {
        await firebaseSignOut(auth)
        router.push("/inactive")
        return
      }

      // Set user with role and name
      setUser({ 
        ...result.user, 
        role: userData?.role || "patient", 
        name: userData?.name || result.user.displayName || email.split("@")[0], 
        status: userData?.status || "active" 
      })

      // Update last login
      await setDoc(
        doc(db, "users", result.user.uid),
        {
          email: result.user.email,
          name: userData?.name || result.user.displayName || email.split("@")[0],
          role: userData?.role || "patient",
          lastLogin: new Date(),
          status: userData?.status || "active",
        },
        { merge: true }
      )

      // Redirect based on role
      const userRole = userData?.role || "patient"
      router.push(`/dashboard/${userRole}`)
      
    } catch (error: any) {
      // Fallback to demo mode for demo credentials
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found") {
        const match = DEMO_USERS.find((u) => u.email === email)
        if (match && password === "1234567890") {
          setUser({
            uid: email,
            email,
            role: match.role,
            displayName: match.role.charAt(0).toUpperCase() + match.role.slice(1),
            name: match.role.charAt(0).toUpperCase() + match.role.slice(1) + " Demo",
            status: "active",
          } as User)
          
          router.push(`/dashboard/${match.role}`)
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
    router.push("/login") // redirect to login page
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
