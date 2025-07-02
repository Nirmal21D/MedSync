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
  const [role, setRole] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      // Redirect based on user role
      const userRole = user.role || "doctor"
      router.push(`/dashboard/${userRole}`)
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !role) return

    setIsLoading(true)
    try {
      await login(email, password, role)
    } catch (error) {
      console.error("Login failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Demo credentials for testing
  const demoCredentials = [
    { role: "admin", email: "admin@medsync.com", password: "admin123" },
    { role: "doctor", email: "doctor@medsync.com", password: "doctor123" },
    { role: "nurse", email: "nurse@medsync.com", password: "nurse123" },
    { role: "pharmacist", email: "pharmacist@medsync.com", password: "pharmacist123" },
    { role: "receptionist", email: "receptionist@medsync.com", password: "receptionist123" },
  ]

  const fillDemoCredentials = (demoRole: string) => {
    const demo = demoCredentials.find((d) => d.role === demoRole)
    if (demo) {
      setEmail(demo.email)
      setPassword(demo.password)
      setRole(demo.role)
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

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !email || !password || !role}>
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
