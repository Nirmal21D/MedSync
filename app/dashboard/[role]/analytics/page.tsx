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
  const [patients, setPatients] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [patientFlowData, setPatientFlowData] = useState<any[]>([])
  const [departmentUtilizationData, setDepartmentUtilizationData] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [inventoryTrendsData, setInventoryTrendsData] = useState<any[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user && role === "admin") {
      getDocs(collection(db, "patients")).then(snapshot => {
        setPatients(snapshot.docs.map(doc => doc.data()))
        setTotalPatients(snapshot.size)
      })
      getDocs(collection(db, "users")).then(snapshot => {
        setStaff(snapshot.docs.map(doc => doc.data()))
        setTotalStaff(snapshot.size)
      })
      getDocs(collection(db, "inventory")).then(snapshot => {
        setInventory(snapshot.docs.map(doc => doc.data()))
        setTotalInventory(snapshot.size)
      })
    }
  }, [user, loading, router, role])

  useEffect(() => {
    if (patients.length > 0) {
      const flow: Record<string, number> = {};
      patients.forEach((p) => {
        let date: Date | null = null;
        if (p.admissionDate) {
          date = new Date(p.admissionDate);
          if (isNaN(date.getTime())) date = null;
        }
        if (!date) return;
        const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
        flow[month] = (flow[month] || 0) + 1;
      });
      setPatientFlowData(Object.entries(flow).map(([month, count]) => ({ month, count })));
    } else {
      setPatientFlowData([]);
    }
  }, [patients])

  useEffect(() => {
    if (patients.length > 0 && staff.length > 0) {
      // Department Utilization: patients per department
      const deptMap: Record<string, { patients: number; staff: number }> = {}
      patients.forEach(p => {
        if (!deptMap[p.department]) deptMap[p.department] = { patients: 0, staff: 0 }
        deptMap[p.department].patients += 1
      })
      staff.forEach(s => {
        if (!deptMap[s.department]) deptMap[s.department] = { patients: 0, staff: 0 }
        deptMap[s.department].staff += 1
      })
      setDepartmentUtilizationData(
        Object.entries(deptMap).map(([department, { patients, staff }]) => ({
          department,
          patients,
          staff,
        }))
      )
    }
  }, [patients, staff])

  useEffect(() => {
    if (inventory.length > 0) {
      // Example: group inventory by category
      const trends: Record<string, number> = {};
      inventory.forEach((item) => {
        if (!item.category) return;
        trends[item.category] = (trends[item.category] || 0) + 1;
      });
      setInventoryTrendsData(Object.entries(trends).map(([category, count]) => ({ category, count })));
    }
  }, [inventory])

  // Only admin can access analytics
  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.push(`/dashboard/${user.role}`)
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || role !== "admin") return null

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  const totalRevenue = patients.reduce((sum: number, p: { bills?: Array<{ total?: number }> }) =>
    sum + (Array.isArray(p.bills) ? p.bills.reduce((bSum: number, b: { total?: number }) => bSum + (b.total || 0), 0) : 0)
  , 0);
  const totalExpenses = staff.reduce((sum, s) =>
    sum + (typeof s.salary === "number" ? s.salary : 0)
  , 0);
  const totalProfit = totalRevenue - totalExpenses

  const financialData = [
    { month: "2024-01", revenue: 10000, expenses: 8000 },
    { month: "2024-02", revenue: 12000, expenses: 9000 },
    // ...
  ];

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Hospital performance metrics and insights</p>
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
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +0% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingDown className="inline h-3 w-3 mr-1" />
                +0% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{totalProfit.toLocaleString()}</div>
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
              {patientFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={patientFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={(value) => {
                      const date = new Date(value);
                      return new Date(date.getFullYear() + "-" + (date.getMonth() + 1) + "-01").toLocaleString("default", { month: "short", year: "numeric" });
                    }} />
                    <Line type="monotone" dataKey="count" stroke="#ff6b6b" strokeWidth={3} dot={{ r: 4, fill: "#1e293b" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">No analytics data available.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              {departmentUtilizationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentUtilizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={(value) => {
                      const date = new Date(value);
                      return new Date(date.getFullYear() + "-" + (date.getMonth() + 1) + "-01").toLocaleString("default", { month: "short", year: "numeric" });
                    }} />
                    <Bar dataKey="patients" fill="#8884d8" name="Patients" />
                    <Bar dataKey="staff" fill="#82ca9d" name="Staff" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">No analytics data available.</div>
              )}
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
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => {
                    const date = new Date(value);
                    return new Date(date.getFullYear() + "-" + (date.getMonth() + 1) + "-01").toLocaleString("default", { month: "short", year: "numeric" });
                  }} />
                  <Area type="monotone" dataKey="revenue" stroke="#82ca9d" fill="#82ca9d" name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#8884d8" fill="#8884d8" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryTrendsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={inventoryTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={(value) => {
                      const date = new Date(value);
                      return new Date(date.getFullYear() + "-" + (date.getMonth() + 1) + "-01").toLocaleString("default", { month: "short", year: "numeric" });
                    }} />
                    <Bar dataKey="count" fill="#8884d8" name="Items" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">No analytics data available.</div>
              )}
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
                  {(
                    Object.entries(
                      staff.reduce((acc, s) => {
                        if (!acc[s.department]) acc[s.department] = { staff: 0, patients: 0 }
                        acc[s.department].staff += 1
                        return acc
                      }, patients.reduce((acc, p) => {
                        if (!acc[p.department]) acc[p.department] = { staff: 0, patients: 0 }
                        acc[p.department].patients += 1
                        return acc
                      }, {} as Record<string, { staff: number; patients: number }>))
                    ) as [string, { staff: number; patients: number }][]
                  ).map(([dept, { staff, patients }]) => (
                    <tr key={dept} className="border-b">
                      <td className="p-2">{dept}</td>
                      <td className="p-2">{patients}</td>
                      <td className="p-2">{staff}</td>
                      <td className="p-2">{staff > 0 ? (patients / staff).toFixed(2) : "-"}</td>
                      <td className="p-2">{patients > staff * 10 ? "Overloaded" : "Normal"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Salary Management Table */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Salary Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Salary (₹/month)</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="p-2">{s.name}</td>
                      <td className="p-2">{s.role}</td>
                      <td className="p-2">{s.department}</td>
                      <td className="p-2">
                        {typeof s.salary === "number" ? (
                          <span className="font-semibold">₹{s.salary.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400 italic">Not set</span>
                        )}
                      </td>
                    </tr>
                  ))}
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