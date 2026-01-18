"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { Heart, Shield, Activity, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const { user, login, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user) {
      // Redirect based on user role
      const userRole = user.role || "doctor"
      router.push(`/dashboard/${userRole}`)
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    setError("")
    try {
      await login(email, password)
    } catch (error: any) {
      setError(error.message || "Login failed.")
      console.error("Login failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Demo credentials for testing
  const demoCredentials = [
    { role: "admin", email: "admin@gmail.com", password: "1234567890" },
    { role: "doctor", email: "adityamak707@gmail.com", password: "1234567890" },
    { role: "nurse", email: "nurse1@gmail.com", password: "1234567890" },
    { role: "pharmacist", email: "pharmacist1@gmail.com", password: "1234567890" },
    { role: "receptionist", email: "receptionist1@gmail.com", password: "1234567890" },
    { role: "patient", email: "demouser1@gmail.com", password: "123456789" },
  ]

  const fillDemoCredentials = (demoRole: string) => {
    const demo = demoCredentials.find((d) => d.role === demoRole)
    if (demo) {
      setEmail(demo.email)
      setPassword(demo.password)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background (match landing page) */}
      <div className="absolute inset-0 -z-20 animate-bgMove bg-[length:300%_300%] bg-gradient-to-br from-[#f0fdfa] via-[#f5d0fe] to-[#ede9fe] dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors duration-500" />
      {/* Restore original four animated blobs */}
      <div className="absolute -z-10 left-1/2 top-1/4 w-[32vw] h-[32vw] bg-emerald-200 dark:bg-emerald-900 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-60%,-40%)'}} />
      <div className="absolute -z-10 right-1/4 bottom-0 w-[28vw] h-[28vw] bg-violet-200 dark:bg-violet-900 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(40%,40%)'}} />
      <div className="absolute -z-10 left-1/4 bottom-0 w-[20vw] h-[20vw] bg-blue-200 dark:bg-blue-900 opacity-30 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-30%,60%)'}} />
      <div className="absolute -z-10 top-0 right-0 w-[22vw] h-[22vw] bg-purple-300 dark:bg-purple-900 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(30%,-30%)'}} />

      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo and title above card */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <Heart className="h-12 w-12 text-emerald-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MedSync</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Healthcare ERP System</p>
        </div>

        <Card className="glass-card bg-white/70 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg w-full dark:text-gray-100">
          <CardHeader>
            <CardTitle className="dark:text-white">Sign In</CardTitle>
            <CardDescription className="dark:text-gray-300">Access your healthcare management dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="dark:text-gray-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="bg-white/60 dark:bg-gray-800/60 border border-emerald-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-200 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="dark:text-gray-200">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="bg-white/60 dark:bg-gray-800/60 border border-emerald-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-200 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 pr-12"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-emerald-600 focus:outline-none"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}

              <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-md hover:from-emerald-600 hover:to-emerald-700 border-0" disabled={isLoading || !email || !password}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              {/* Sign Up Link */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                New patient?{" "}
                <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
                  Create an account
                </Link>
              </div>
            </form>

            <div className="mt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Demo Accounts:</p>
              <div className="grid grid-cols-2 gap-2">
                {demoCredentials.map((demo) => (
                  <Button
                    key={demo.role}
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoCredentials(demo.role)}
                    className="text-xs border-emerald-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-gray-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                  >
                    {demo.role.charAt(0).toUpperCase() + demo.role.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="flex flex-col items-center p-4 glass-card bg-white/60 dark:bg-gray-900/70 rounded-lg shadow-md dark:text-gray-100">
            <Shield className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">Secure Access</p>
          </div>
          <div className="flex flex-col items-center p-4 glass-card bg-white/60 dark:bg-gray-900/70 rounded-lg shadow-md dark:text-gray-100">
            <Activity className="h-8 w-8 text-emerald-400 mb-2" />
            <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">Real-time Data</p>
          </div>
        </div>
      </div>
    </div>
  )
}
