"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Package, Activity, AlertTriangle, CheckCircle } from "lucide-react"
import UserManagement from "./user-management"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function AdminDashboard() {
  const [totalPatients, setTotalPatients] = useState(0)
  const [totalStaff, setTotalStaff] = useState(0)
  const [criticalPatients, setCriticalPatients] = useState(0)
  const [lowStockItems, setLowStockItems] = useState(0)

  useEffect(() => {
    if (!db) return
    // Fetch patients
    getDocs(collection(db, "patients")).then(snapshot => {
      setTotalPatients(snapshot.size)
      setCriticalPatients(snapshot.docs.filter(doc => doc.data().status === "critical").length)
    })
    // Fetch staff
    getDocs(collection(db, "users")).then(snapshot => {
      setTotalStaff(snapshot.size)
    })
    // Fetch inventory
    getDocs(collection(db, "inventory")).then(snapshot => {
      setLowStockItems(snapshot.docs.filter(doc => {
        const status = doc.data().status
        return status === "low-stock" || status === "out-of-stock"
      }).length)
    })
  }, [])

  return (
    <div className="relative space-y-8 min-h-screen p-4 overflow-hidden scrollbar-none">
      {/* Full-page animated gradient background, black in dark mode */}
      <div className="absolute inset-0 -z-20 animate-bgMove bg-[length:300%_300%] bg-gradient-to-br from-[#f0fdfa] via-[#f5d0fe] to-[#ede9fe] dark:from-black dark:via-black dark:to-black transition-colors duration-500" />
      {/* Single decorative blob, centered at the top and always within the screen */}
      <div className="absolute -z-10 left-1/2 top-0 w-[60vw] max-w-[100vw] h-[30vw] bg-emerald-200 dark:bg-emerald-900 opacity-30 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-50%,0)'}} />
      <div>
        <h1 className="text-4xl font-extrabold text-foreground mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground">Admin dashboard subheading here</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Total Patients</CardTitle>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900 p-2"><Users className="h-6 w-6 text-emerald-600 dark:text-emerald-300" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{totalPatients}</div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Staff Members</CardTitle>
            <div className="rounded-xl bg-violet-100 dark:bg-violet-900 p-2"><Users className="h-6 w-6 text-violet-600 dark:text-violet-300" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{totalStaff}</div>
            <p className="text-xs text-muted-foreground">All active</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Critical Patients</CardTitle>
            <div className="rounded-xl bg-red-100 dark:bg-red-900 p-2"><Activity className="h-6 w-6 text-red-600 dark:text-red-300" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-600 dark:text-red-300">{criticalPatients}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Inventory Alerts</CardTitle>
            <div className="rounded-xl bg-orange-100 dark:bg-orange-900 p-2"><Package className="h-6 w-6 text-orange-600 dark:text-orange-300" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-600 dark:text-orange-300">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>
      </div>
      {/* Recent Alerts */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground">System Alerts</CardTitle>
          <CardDescription className="text-muted-foreground">Recent notifications and system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 glass-card bg-red-50/60 dark:bg-red-900/40 rounded-lg">
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-2"><AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" /></div>
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Critical Patient Alert</p>
                <p className="text-sm text-red-600 dark:text-red-300">Emily Davis requires immediate attention</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 glass-card bg-orange-50/60 dark:bg-orange-900/40 rounded-lg">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-2"><Package className="h-5 w-5 text-orange-600 dark:text-orange-300" /></div>
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">Low Stock Alert</p>
                <p className="text-sm text-orange-600 dark:text-orange-300">Surgical gloves running low - 50 boxes remaining</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 glass-card bg-green-50/60 dark:bg-green-900/40 rounded-lg">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-2"><CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" /></div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">System Update</p>
                <p className="text-sm text-green-600 dark:text-green-300">Daily backup completed successfully</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
