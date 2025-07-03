"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Package, Activity, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
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

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Hospital management overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
            <p className="text-xs text-muted-foreground">All active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Patients</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalPatients}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Alerts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>
      </div>
      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>Recent notifications and system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Critical Patient Alert</p>
                <p className="text-sm text-red-600">Emily Davis requires immediate attention</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
              <Package className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Low Stock Alert</p>
                <p className="text-sm text-orange-600">Surgical gloves running low - 50 boxes remaining</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
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
