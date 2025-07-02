"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Package, Activity, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { mockPatients, mockStaff, mockInventory, mockAIInsights } from "@/lib/mock-data"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export default function AdminDashboard() {
  const totalPatients = mockPatients.length
  const totalStaff = mockStaff.length
  const criticalPatients = mockPatients.filter((p) => p.status === "critical").length
  const lowStockItems = mockInventory.filter((i) => i.status === "low-stock" || i.status === "out-of-stock").length

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

      {/* AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              {mockAIInsights.opdPrediction.title}
            </CardTitle>
            <CardDescription>AI-powered prediction based on historical data</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockAIInsights.opdPrediction.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="patients" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-2">💡 {mockAIInsights.opdPrediction.insight}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{mockAIInsights.commonConditions.title}</CardTitle>
            <CardDescription>Most frequent diagnoses this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mockAIInsights.commonConditions.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ condition, percentage }) => `${condition} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {mockAIInsights.commonConditions.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-2">💡 {mockAIInsights.commonConditions.insight}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Doctors */}
      <Card>
        <CardHeader>
          <CardTitle>{mockAIInsights.topDoctors.title}</CardTitle>
          <CardDescription>Based on patient volume and satisfaction ratings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAIInsights.topDoctors.data.map((doctor, index) => (
              <div key={doctor.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{doctor.name}</p>
                    <p className="text-sm text-gray-600">{doctor.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{doctor.patients} patients</p>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-1">Rating:</span>
                    <Badge variant="secondary">{doctor.rating}/5.0</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">💡 {mockAIInsights.topDoctors.insight}</p>
        </CardContent>
      </Card>

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
