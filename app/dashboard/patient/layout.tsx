"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout role="patient">{children}</DashboardLayout>
}
