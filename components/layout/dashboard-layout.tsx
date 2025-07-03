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
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  role: string
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 flex" style={{background: 'linear-gradient(120deg, #e0e7ff 0%, #f0fdfa 40%, #f5d0fe 100%, #fef9c3 120%)', backgroundSize: '300% 300%'}}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="h-[6.5vh] px-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-violet-500">
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
                        ? "bg-white text-emerald-900 shadow-lg border-l-4 border-emerald-500"
                        : "text-gray-600 hover:bg-gray-50 hover:text-emerald-700 hover:shadow-md",
                    )}
                    style={isActive ? { boxShadow: '0 4px 24px 0 rgba(16, 185, 129, 0.10)' } : {}}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full shadow-md" />
                    )}
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 transition-colors flex-shrink-0",
                        isActive ? "text-emerald-700" : "text-gray-400 group-hover:text-emerald-500",
                      )}
                    />
                    <span className={isActive ? "font-bold" : "font-medium"}>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-violet-500 rounded-full flex items-center justify-center shadow-md">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 capitalize truncate bg-gray-200 px-2 py-1 rounded-full inline-block mt-1">
                  {role}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300 bg-white shadow-sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 glass-card bg-white/30 backdrop-blur-xl">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome back, <span className="font-medium">{user?.name || "User"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
