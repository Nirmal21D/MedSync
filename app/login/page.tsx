"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { Heart, Shield, Activity } from "lucide-react"

export default function LoginPage() {
  const { user, login, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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
    { role: "doctor", email: "doctor1@gmail.com", password: "1234567890" },
    { role: "nurse", email: "nurse1@gmail.com", password: "1234567890" },
    { role: "pharmacist", email: "pharmacist1@gmail.com", password: "1234567890" },
    { role: "receptionist", email: "receptionist1@gmail.com", password: "1234567890" },
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-12 w-12 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">MedSync</h1>
          </div>
          <p className="text-gray-600">Healthcare ERP System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Access your healthcare management dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <Button type="submit" className="w-full" disabled={isLoading || !email || !password}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-3">Demo Accounts:</p>
              <div className="grid grid-cols-2 gap-2">
                {demoCredentials.map((demo) => (
                  <Button
                    key={demo.role}
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoCredentials(demo.role)}
                    className="text-xs"
                  >
                    {demo.role.charAt(0).toUpperCase() + demo.role.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm">
            <Shield className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Secure Access</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm">
            <Activity className="h-8 w-8 text-green-600 mb-2" />
            <p className="text-sm text-gray-600">Real-time Data</p>
          </div>
        </div>
      </div>
    </div>
  )
}
