"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import AdminDashboard from "@/components/dashboards/admin-dashboard"
import DoctorDashboard from "@/components/dashboards/doctor-dashboard"
import NurseDashboard from "@/components/dashboards/nurse-dashboard"
import PharmacistDashboard from "@/components/dashboards/pharmacist-dashboard"
import ReceptionistDashboard from "@/components/dashboards/receptionist-dashboard"

export default function DashboardPage({ params }: { params: { role: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = params

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const renderDashboard = () => {
    switch (role) {
      case "admin":
        return <AdminDashboard />
      case "doctor":
        return <DoctorDashboard />
      case "nurse":
        return <NurseDashboard />
      case "pharmacist":
        return <PharmacistDashboard />
      case "receptionist":
        return <ReceptionistDashboard />
      default:
        return <div>Invalid role</div>
    }
  }

  return <DashboardLayout role={role}>{renderDashboard()}</DashboardLayout>
}
