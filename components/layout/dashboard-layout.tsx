"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Heart,
  Users,
  Calendar,
  FileText,
  Package,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Bed,
  ClipboardList,
  Sun,
  Moon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface DashboardLayoutProps {
  children: React.ReactNode
  role: string
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const getNavigationItems = (userRole: string) => {
    const baseItems = [{ name: "Dashboard", href: `/dashboard/${userRole}`, icon: BarChart3 }]

    switch (userRole) {
      case "admin":
        return [
          ...baseItems,
          { name: "Staff Management", href: `/dashboard/${userRole}/staff`, icon: Users },
          { name: "Inventory", href: `/dashboard/${userRole}/inventory`, icon: Package },
          { name: "Bed Management", href: `/dashboard/${userRole}/bed-management`, icon: Bed },
          { name: "Analytics", href: `/dashboard/${userRole}/analytics`, icon: BarChart3 },
          { name: "Settings", href: `/dashboard/${userRole}/settings`, icon: Settings },
        ]
      case "doctor":
        return [
          ...baseItems,
          { name: "Patients", href: `/dashboard/${userRole}/patients`, icon: Users },
          { name: "Prescriptions", href: `/dashboard/${userRole}/prescriptions`, icon: FileText },
        ]
      case "nurse":
        return [
          ...baseItems,
          { name: "My Patients", href: `/dashboard/${userRole}/patients`, icon: Users },
          { name: "Nursing Notes", href: `/dashboard/${userRole}/notes`, icon: ClipboardList },
        ]
      case "pharmacist":
        return [
          ...baseItems,
          { name: "Prescriptions", href: `/dashboard/${userRole}/prescriptions`, icon: FileText },
          { name: "Inventory", href: `/dashboard/${userRole}/inventory`, icon: Package },
        ]
      case "receptionist":
        return [
          ...baseItems,
          { name: "Patients", href: `/dashboard/${userRole}/patients`, icon: Users },
          { name: "Bed Management", href: `/dashboard/${userRole}/beds`, icon: Bed },
        ]
      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems(role)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  function ThemeToggle() {
    return (
      <button
        aria-label="Toggle theme"
        className="ml-2 p-2 rounded-full hover:bg-muted transition-colors"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Solid background layer: white in light mode, black in dark mode */}
      <div className="fixed inset-0 -z-50 bg-white dark:bg-black" />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground shadow-xl border-r border-border transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 h-screen",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="h-[6.5vh] px-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-emerald-500 to-violet-500 dark:from-sidebar dark:to-sidebar">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-white drop-shadow-lg mr-3" />
              <span className="text-2xl font-extrabold tracking-wide bg-gradient-to-r from-white via-emerald-100 to-violet-100 bg-clip-text text-transparent drop-shadow-md shadow-white">MedSync</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-emerald-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-emerald-50 dark:bg-card text-emerald-900 dark:text-emerald-200 shadow-lg border-l-4 border-emerald-500 dark:border-emerald-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-sidebar/80 hover:text-emerald-700 dark:hover:text-emerald-300 hover:shadow-md",
                    )}
                    style={isActive ? { boxShadow: '0 4px 24px 0 rgba(16, 185, 129, 0.10)' } : {}}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1.5 h-8 bg-emerald-500 dark:bg-emerald-400 rounded-r-full shadow-md" />
                    )}
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 transition-colors flex-shrink-0",
                        isActive ? "text-emerald-700 dark:text-emerald-300" : "text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-300",
                      )}
                    />
                    <span className={isActive ? "font-bold" : "font-medium"}>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-border p-4 bg-gray-50 dark:bg-sidebar">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-violet-500 rounded-full flex items-center justify-center shadow-md">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-sidebar-foreground truncate">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300 capitalize truncate bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-full inline-block mt-1">
                  {role}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 bg-white dark:bg-sidebar shadow-sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-card text-foreground shadow-sm border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome back, <span className="font-medium">{user?.name || "User"}</span>
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto relative">
          {/* Animated blobs, behind content */}
          <div className="absolute z-0 left-1/2 top-1/4 w-[32vw] h-[32vw] bg-emerald-200 dark:bg-emerald-400 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-60%,-40%)'}} />
          <div className="absolute z-0 right-1/4 bottom-0 w-[28vw] h-[28vw] bg-violet-200 dark:bg-violet-400 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(40%,40%)'}} />
          <div className="absolute z-0 left-1/4 bottom-0 w-[20vw] h-[20vw] bg-blue-200 dark:bg-blue-400 opacity-30 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-30%,60%)'}} />
          <div className="absolute z-0 top-0 right-0 w-[22vw] h-[22vw] bg-purple-300 dark:bg-purple-400 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(30%,-30%)'}} />
          {children}
        </main>
      </div>
    </div>
  )
}
