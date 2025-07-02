"use client"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { TrendingUp, TrendingDown, Users, DollarSign, Package, Activity, Calendar, FileText } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import * as React from "react"

export default function AnalyticsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const [totalPatients, setTotalPatients] = useState(0)
  const [totalStaff, setTotalStaff] = useState(0)
  const [totalInventory, setTotalInventory] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user && role === "admin") {
      getDocs(collection(db, "patients")).then(snapshot => setTotalPatients(snapshot.size))
      getDocs(collection(db, "users")).then(snapshot => setTotalStaff(snapshot.size))
      getDocs(collection(db, "inventory")).then(snapshot => setTotalInventory(snapshot.size))
    }
  }, [user, loading, router, role])

  // Only admin can access analytics
  useEffect(() => {
    if (!loading && user && role !== "admin") {
      router.push(`/dashboard/${user.role}`)
    }
  }, [user, loading, role, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || role !== "admin") return null

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  const totalRevenue = 0
  const totalExpenses = 0
  const totalProfit = totalRevenue - totalExpenses

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Hospital performance metrics and insights</p>
          </div>
          <Select defaultValue="last-6-months">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="last-6-months">Last 6 Months</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +0% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPatients}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +0% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStaff}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +0% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInventory}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingDown className="inline h-3 w-3 mr-1" />
                +0% from last period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Flow Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">No analytics data available.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">No analytics data available.</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">No analytics data available.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">No analytics data available.</div>
            </CardContent>
          </Card>
        </div>

        {/* Department Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Patients</th>
                    <th className="text-left p-2">Staff</th>
                    <th className="text-left p-2">Utilization</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Placeholder for department data */}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                This Month Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Total Admissions:</span>
                <span className="font-bold">0</span>
              </div>
              <div className="flex justify-between">
                <span>Total Discharges:</span>
                <span className="font-bold">0</span>
              </div>
              <div className="flex justify-between">
                <span>Average Stay:</span>
                <span className="font-bold">0 days</span>
              </div>
              <div className="flex justify-between">
                <span>Bed Occupancy:</span>
                <span className="font-bold">0%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Total Revenue:</span>
                <span className="font-bold text-green-600">$0</span>
              </div>
              <div className="flex justify-between">
                <span>Total Expenses:</span>
                <span className="font-bold text-red-600">$0</span>
              </div>
              <div className="flex justify-between">
                <span>Net Profit:</span>
                <span className="font-bold text-blue-600">$0</span>
              </div>
              <div className="flex justify-between">
                <span>Profit Margin:</span>
                <span className="font-bold">0%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Patient Satisfaction:</span>
                <span className="font-bold">0/5.0</span>
              </div>
              <div className="flex justify-between">
                <span>Readmission Rate:</span>
                <span className="font-bold">0%</span>
              </div>
              <div className="flex justify-between">
                <span>Average Response Time:</span>
                <span className="font-bold">0 min</span>
              </div>
              <div className="flex justify-between">
                <span>Staff Efficiency:</span>
                <span className="font-bold">0%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
