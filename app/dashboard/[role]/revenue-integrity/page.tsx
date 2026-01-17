"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, DollarSign, TrendingUp, CheckCircle, XCircle } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import type { Patient, Appointment, LabOrder, Prescription, BillingItem } from "@/lib/types"
import { detectUnbilledServices, calculateUnbilledAmount, formatCurrency } from "@/lib/billing"

export default function RevenueIntegrityPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  
  const [unbilledServices, setUnbilledServices] = useState<any[]>([])
  const [totalUnbilled, setTotalUnbilled] = useState(0)
  const [loadingData, setLoadingData] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    capturedRevenue: 0,
    leakagePercentage: 0,
    completedAppointments: 0,
    completedLabOrders: 0,
    dispensedPrescriptions: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user && role === "admin") {
      fetchRevenueData()
    }
  }, [user, loading, router, role])

  const fetchRevenueData = async () => {
    if (!db) return

    try {
      // Fetch all data
      const [patientsSnap, appointmentsSnap, labOrdersSnap, prescriptionsSnap, billsSnap] = await Promise.all([
        getDocs(collection(db, "patients")),
        getDocs(collection(db, "appointments")),
        getDocs(collection(db, "labOrders")),
        getDocs(collection(db, "prescriptions")),
        getDocs(collection(db, "billingItems"))
      ])

      const patients = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient))
      const appointments = appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
      const labOrders = labOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabOrder))
      const prescriptions = prescriptionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription))
      const bills = billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BillingItem))

      // Detect unbilled services across all patients
      let allUnbilled: any[] = []
      patients.forEach(patient => {
        const patientUnbilled = detectUnbilledServices(
          patient.id,
          patient.name,
          patient.uhid,
          appointments,
          labOrders,
          prescriptions,
          bills
        )
        allUnbilled = [...allUnbilled, ...patientUnbilled]
      })

      setUnbilledServices(allUnbilled)
      setTotalUnbilled(calculateUnbilledAmount(allUnbilled))

      // Calculate stats
      const completedAppointments = appointments.filter(apt => apt.status === 'completed').length
      const completedLabOrders = labOrders.filter(order => order.status === 'completed').length
      const dispensedPrescriptions = prescriptions.filter(rx => rx.status === 'approved').length

      const expectedRevenue = (completedAppointments * 500) + 
                             labOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      const capturedRevenue = bills.reduce((sum, bill) => sum + bill.totalPrice, 0)
      const leakage = ((expectedRevenue - capturedRevenue) / expectedRevenue) * 100

      setStats({
        totalRevenue: expectedRevenue,
        capturedRevenue,
        leakagePercentage: isNaN(leakage) ? 0 : leakage,
        completedAppointments,
        completedLabOrders,
        dispensedPrescriptions
      })

      setLoadingData(false)
    } catch (error) {
      console.error("Error fetching revenue data:", error)
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || role !== "admin") {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access Denied. This page is only accessible to administrators.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Revenue Integrity Dashboard</h1>
        <p className="text-muted-foreground">Zero Revenue Leakage™ - Monitor and capture all billable services</p>
      </div>

      {/* Critical Alert */}
      {unbilledServices.length > 0 && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="text-lg">
            <strong>{unbilledServices.length} unbilled services detected!</strong>
            <br />
            Potential revenue loss: <strong>{formatCurrency(totalUnbilled)}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Expected total</p>
          </CardContent>
        </Card>

        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Captured</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.capturedRevenue)}</div>
            <p className="text-xs text-muted-foreground">Billed successfully</p>
          </CardContent>
        </Card>

        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unbilled</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalUnbilled)}</div>
            <p className="text-xs text-muted-foreground">{unbilledServices.length} services</p>
          </CardContent>
        </Card>

        <Card className={`glass-card bg-card backdrop-blur-xl shadow-lg ${stats.leakagePercentage > 10 ? 'border-red-200' : 'border-green-200'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leakage Rate</CardTitle>
            <TrendingUp className={`h-4 w-4 ${stats.leakagePercentage > 10 ? 'text-red-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.leakagePercentage > 10 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.leakagePercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Target: &lt;5%</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Statistics */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle>Service Completion Statistics</CardTitle>
          <CardDescription>Services that should generate bills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Completed Appointments</p>
              <p className="text-3xl font-bold">{stats.completedAppointments}</p>
              <p className="text-xs text-muted-foreground mt-1">@ ₹500 each = {formatCurrency(stats.completedAppointments * 500)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Lab Orders</p>
              <p className="text-3xl font-bold">{stats.completedLabOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">Various pricing</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dispensed Prescriptions</p>
              <p className="text-3xl font-bold">{stats.dispensedPrescriptions}</p>
              <p className="text-xs text-muted-foreground mt-1">Medicines dispensed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unbilled Services List */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle>Unbilled Services</CardTitle>
          <CardDescription>Services completed but not billed - immediate action required</CardDescription>
        </CardHeader>
        <CardContent>
          {unbilledServices.length > 0 ? (
            <div className="space-y-3">
              {unbilledServices.map((service, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{service.serviceType}</Badge>
                      <p className="font-medium">{service.patientName}</p>
                      <span className="text-sm text-muted-foreground">({service.uhid})</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{service.serviceName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Performed by: {service.performedBy} • {new Date(service.performedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">{service.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(service.expectedAmount)}</p>
                    <Button size="sm" className="mt-2">Generate Bill</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-600">Excellent! Zero Revenue Leakage</p>
              <p className="text-muted-foreground">All services are properly billed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Auto-Billing Active:</strong> Consultations and lab tests generate bills automatically
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Manual Review Required:</strong> Prescriptions require pharmacist approval before billing
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertDescription>
                <strong>Daily Task:</strong> Review this dashboard every morning to catch any missed bills
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
