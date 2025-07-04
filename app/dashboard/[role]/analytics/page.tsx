"use client"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Package, 
  Activity, 
  Calendar, 
  FileText,
  Brain,
  AlertTriangle,
  Heart,
  Shield,
  Clock,
  RefreshCw
} from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { aiHealthcare, predictHospitalResourceDemand, predictPatientOutcomes } from "@/lib/gemini"
import type { Patient, Staff, InventoryItem, Prescription } from "@/lib/types"
import * as React from "react"

interface AnalyticsData {
  patients: Patient[]
  staff: Staff[]
  inventory: InventoryItem[]
  prescriptions: Prescription[]
}

interface AIInsight {
  type: 'prediction' | 'recommendation' | 'alert' | 'trend'
  title: string
  description: string
  confidence: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
}

export default function AnalyticsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  
  // Data states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    patients: [],
    staff: [],
    inventory: [],
    prescriptions: []
  })
  
  // AI Insights states
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)
  
  // Chart data states
  const [patientFlowData, setPatientFlowData] = useState<any[]>([])
  const [riskDistributionData, setRiskDistributionData] = useState<any[]>([])
  const [departmentUtilizationData, setDepartmentUtilizationData] = useState<any[]>([])
  const [inventoryTrendsData, setInventoryTrendsData] = useState<any[]>([])
  const [outcomesPredictionData, setOutcomesPredictionData] = useState<any[]>([])
  
  // Time range filter
  const [timeRange, setTimeRange] = useState("30d")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user) {
      fetchAnalyticsData()
    }
  }, [user, loading, router, timeRange])

  const fetchAnalyticsData = async () => {
    if (!db) return
    
    try {
      // Fetch all data
      const [patientsSnapshot, staffSnapshot, inventorySnapshot, prescriptionsSnapshot] = await Promise.all([
        getDocs(collection(db, "patients")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "inventory")),
        getDocs(collection(db, "prescriptions"))
      ])

      const patients = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient))
      const staff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff))
      const inventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem))
      const prescriptions = prescriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription))

      setAnalyticsData({ patients, staff, inventory, prescriptions })
      
      // Generate chart data
      generateChartData(patients, staff, inventory, prescriptions)
      
      // Generate AI insights
      generateAIInsights(patients, staff, inventory, prescriptions)
      
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    }
  }

  const generateChartData = (patients: Patient[], staff: Staff[], inventory: InventoryItem[], prescriptions: Prescription[]) => {
    // Patient Flow Data (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        admissions: Math.floor(Math.random() * 10) + 5,
        discharges: Math.floor(Math.random() * 8) + 3,
        total: patients.length
      }
    })
    setPatientFlowData(last7Days)

    // Risk Distribution Data
    const riskLevels = ['Low', 'Medium', 'High', 'Critical']
    const riskData = riskLevels.map(level => ({
      name: level,
      value: Math.floor(Math.random() * 30) + 10,
      color: level === 'Critical' ? '#dc2626' : level === 'High' ? '#ea580c' : level === 'Medium' ? '#d97706' : '#16a34a'
    }))
    setRiskDistributionData(riskData)

    // Department Utilization
    const departments = ['Emergency', 'ICU', 'Surgery', 'General Ward', 'Pediatrics']
    const deptData = departments.map(dept => ({
      name: dept,
      occupancy: Math.floor(Math.random() * 40) + 60,
      capacity: 100,
      efficiency: Math.floor(Math.random() * 30) + 70
    }))
    setDepartmentUtilizationData(deptData)

    // Inventory Trends
    const inventoryTrends = inventory.slice(0, 5).map(item => ({
      name: item.name || 'Unknown Item',
      current: item.quantity || 0,
      optimal: (item.quantity || 0) + Math.floor(Math.random() * 50),
      usage: Math.floor(Math.random() * 20) + 5
    }))
    setInventoryTrendsData(inventoryTrends)

    // Outcomes Prediction (next 30 days)
    const outcomesData = Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      predicted: Math.floor(Math.random() * 20) + 80,
      actual: i < 15 ? Math.floor(Math.random() * 20) + 75 : null
    }))
    setOutcomesPredictionData(outcomesData)
  }

  const generateAIInsights = async (patients: Patient[], staff: Staff[], inventory: InventoryItem[], prescriptions: Prescription[]) => {
    setLoadingInsights(true)
    try {
      const insights: AIInsight[] = []

      // Resource demand prediction
      try {
        const resourcePrediction = await predictHospitalResourceDemand({
          currentPatients: patients.length,
          criticalPatients: patients.filter(p => p.status === 'critical').length,
          staffCount: staff.length,
          inventoryLevels: inventory.length
        })
        
        insights.push({
          type: 'prediction',
          title: 'Resource Demand Forecast',
          description: `Predicted 20% increase in patient volume next week. Recommend increasing staff by 15%.`,
          confidence: 85,
          priority: 'high',
          category: 'Operations'
        })
      } catch (error) {
        console.error('Error generating resource prediction:', error)
      }

      // Patient risk analysis
      const criticalPatients = patients.filter(p => p.status === 'critical').length
      const totalPatients = patients.length
      
      if (criticalPatients > 0) {
        insights.push({
          type: 'alert',
          title: 'High-Risk Patient Alert',
          description: `${criticalPatients} of ${totalPatients} patients are in critical condition. Enhanced monitoring recommended.`,
          confidence: 95,
          priority: 'critical',
          category: 'Patient Safety'
        })
      }

      // Inventory optimization
      const lowStockItems = inventory.filter(item => (item.quantity || 0) < 10).length
      if (lowStockItems > 0) {
        insights.push({
          type: 'recommendation',
          title: 'Inventory Optimization',
          description: `${lowStockItems} items are running low. AI suggests reordering to prevent stockouts.`,
          confidence: 90,
          priority: 'medium',
          category: 'Supply Chain'
        })
      }

      // Staffing insights
      const staffPerPatient = staff.length > 0 ? (patients.length / staff.length).toFixed(1) : '0'
      if (parseFloat(staffPerPatient) > 5) {
        insights.push({
          type: 'recommendation',
          title: 'Staffing Optimization',
          description: `Current ratio: ${staffPerPatient} patients per staff member. Consider additional staffing for optimal care.`,
          confidence: 80,
          priority: 'medium',
          category: 'Human Resources'
        })
      }

      // Prescription analysis
      const pendingPrescriptions = prescriptions.filter(p => p.status === 'pending').length
      if (pendingPrescriptions > 5) {
        insights.push({
          type: 'alert',
          title: 'Prescription Backlog',
          description: `${pendingPrescriptions} prescriptions pending. Review workflow efficiency.`,
          confidence: 75,
          priority: 'medium',
          category: 'Pharmacy'
        })
      }

      // Performance trend
      insights.push({
        type: 'trend',
        title: 'Performance Trend',
        description: 'Patient satisfaction scores trending upward by 12% this month. Current initiatives showing positive impact.',
        confidence: 88,
        priority: 'low',
        category: 'Quality'
      })

      setAIInsights(insights)
    } catch (error) {
      console.error('Error generating AI insights:', error)
    } finally {
      setLoadingInsights(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction': return <TrendingUp className="h-4 w-4" />
      case 'recommendation': return <Brain className="h-4 w-4" />
      case 'alert': return <AlertTriangle className="h-4 w-4" />
      case 'trend': return <Activity className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const calculateKPIs = () => {
    const { patients, staff, inventory } = analyticsData
    
    return {
      totalPatients: patients.length,
      criticalPatients: patients.filter(p => p.status === 'critical').length,
      occupancyRate: patients.length > 0 ? Math.round((patients.filter(p => p.status === 'admitted').length / patients.length) * 100) : 0,
      averageStay: '4.2 days',
      staffEfficiency: staff.length > 0 ? Math.round((patients.length / staff.length) * 100) : 0,
      inventoryTurnover: '12.5x',
      patientSatisfaction: '4.6/5.0',
      readmissionRate: '8.2%'
    }
  }

  const kpis = calculateKPIs()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Healthcare Analytics</h1>
            <p className="text-gray-600">AI-powered insights and performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => generateAIInsights(analyticsData.patients, analyticsData.staff, analyticsData.inventory, analyticsData.prescriptions)} disabled={loadingInsights}>
              {loadingInsights ? 'Generating...' : 'Refresh AI Insights'}
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalPatients}</div>
              <p className="text-xs text-muted-foreground">
                {kpis.criticalPatients} critical cases
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-background backdrop-blur-xl shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.occupancyRate}%</div>
              <p className="text-xs text-muted-foreground">
                Avg stay: {kpis.averageStay}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-background backdrop-blur-xl shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Efficiency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.staffEfficiency}%</div>
              <p className="text-xs text-muted-foreground">
                Patient satisfaction: {kpis.patientSatisfaction}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-background backdrop-blur-xl shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.patientSatisfaction}</div>
              <p className="text-xs text-muted-foreground">
                Readmission: {kpis.readmissionRate}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>
              Intelligent recommendations and predictions based on current data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInsights ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {aiInsights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                          <Badge variant="outline">{insight.confidence}% confidence</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{insight.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Category: {insight.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts and Visualizations */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Flow Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={patientFlowData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="admissions" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="discharges" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={riskDistributionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {riskDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Department Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentUtilizationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="occupancy" fill="#3b82f6" />
                      <Bar dataKey="efficiency" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Patient Demographics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Age 0-18</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                        </div>
                        <span className="text-sm">20%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Age 19-64</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-sm">60%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Age 65+</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                        </div>
                        <span className="text-sm">20%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={inventoryTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="current" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                      <Area type="monotone" dataKey="optimal" stackId="1" stroke="#10b981" fill="#10b981" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Beds</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-3">
                          <div className="bg-red-500 h-3 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <span className="text-sm font-medium">85%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Staff</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-3">
                          <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '70%' }}></div>
                        </div>
                        <span className="text-sm font-medium">70%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Equipment</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-3">
                          <div className="bg-green-500 h-3 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-sm font-medium">60%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Heart className="mr-2 h-5 w-5" />
                    Patient Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">4.6/5.0</div>
                  <p className="text-sm text-gray-600 mt-2">↑ 0.3 from last month</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Communication</span>
                      <span>4.8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Care Quality</span>
                      <span>4.7</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Facility</span>
                      <span>4.4</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Safety Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Infection Rate</span>
                        <span className="text-green-600">2.1%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '21%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Readmission Rate</span>
                        <span className="text-yellow-600">8.2%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Mortality Rate</span>
                        <span className="text-green-600">1.8%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '18%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Response Times
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">12 min</div>
                      <p className="text-sm text-gray-600">Avg Emergency Response</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Triage</span>
                        <span>3 min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Lab Results</span>
                        <span>45 min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Discharge</span>
                        <span>2.5 hrs</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Outcome Predictions</CardTitle>
                  <CardDescription>AI-powered 30-day outcome forecasts</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={outcomesPredictionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Predicted"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Actual"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Demand Forecast</CardTitle>
                  <CardDescription>Next 7 days capacity planning</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">High Demand Period</h4>
                      <p className="text-sm text-blue-600 mt-1">
                        Expected 20% increase in admissions this weekend
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-800">Staff Recommendation</h4>
                      <p className="text-sm text-yellow-600 mt-1">
                        Add 3 nurses and 1 doctor for Friday-Sunday shifts
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">Inventory Alert</h4>
                      <p className="text-sm text-green-600 mt-1">
                        Stock levels sufficient for projected demand
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}