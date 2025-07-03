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
    <div className="relative space-y-8 theme-bg min-h-screen p-4 overflow-hidden">
      {/* Animated color blobs */}
      <div className="absolute -z-10 left-1/2 top-1/4 w-[32vw] h-[32vw] bg-emerald-200 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-60%,-40%)'}} />
      <div className="absolute -z-10 right-1/4 bottom-0 w-[28vw] h-[28vw] bg-violet-200 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(40%,40%)'}} />
      <div className="absolute -z-10 left-1/4 bottom-0 w-[20vw] h-[20vw] bg-purple-200 opacity-30 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-30%,60%)'}} />

      <div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-1">Admin Dashboard</h1>
        <p className="text-lg text-gray-700 font-medium">Hospital management overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="glass-card bg-white/70 backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Total Patients</CardTitle>
            <div className="rounded-xl bg-emerald-100 p-2"><Users className="h-6 w-6 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-gray-900">{totalPatients}</div>
            <p className="text-xs text-gray-500">+2 from yesterday</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-white/70 backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Staff Members</CardTitle>
            <div className="rounded-xl bg-violet-100 p-2"><Users className="h-6 w-6 text-violet-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-gray-900">{totalStaff}</div>
            <p className="text-xs text-gray-500">All active</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-white/70 backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Critical Patients</CardTitle>
            <div className="rounded-xl bg-red-100 p-2"><Activity className="h-6 w-6 text-red-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-600">{criticalPatients}</div>
            <p className="text-xs text-gray-500">Requires attention</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-white/70 backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Inventory Alerts</CardTitle>
            <div className="rounded-xl bg-orange-100 p-2"><Package className="h-6 w-6 text-orange-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-600">{lowStockItems}</div>
            <p className="text-xs text-gray-500">Items need restocking</p>
          </CardContent>
        </Card>
      </div>
      {/* Recent Alerts */}
      <Card className="glass-card bg-white/70 backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>Recent notifications and system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 glass-card bg-red-50/60 rounded-lg">
              <div className="rounded-full bg-red-100 p-2"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="font-medium text-red-800">Critical Patient Alert</p>
                <p className="text-sm text-red-600">Emily Davis requires immediate attention</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 glass-card bg-orange-50/60 rounded-lg">
              <div className="rounded-full bg-orange-100 p-2"><Package className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="font-medium text-orange-800">Low Stock Alert</p>
                <p className="text-sm text-orange-600">Surgical gloves running low - 50 boxes remaining</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 glass-card bg-green-50/60 rounded-lg">
              <div className="rounded-full bg-green-100 p-2"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="font-medium text-green-800">System Update</p>
                <p className="text-sm text-green-600">Daily backup completed successfully</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
