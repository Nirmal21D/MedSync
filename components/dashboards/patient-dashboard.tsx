"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, FileText, User, Phone, AlertCircle, Plus, Activity } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { Patient, Appointment, LabOrder, Prescription } from "@/lib/types"
import { formatTimeSlot, estimateWaitTime } from "@/lib/appointments"
import Link from "next/link"

export default function PatientDashboard() {
  const { user } = useAuth()
  const [patientData, setPatientData] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      // Demo mode - no Firebase
      if (!db) {
        setPatientData({
          id: "demo-patient-1",
          uhid: "UHID-202601-00001",
          name: user.name || "Demo Patient",
          age: 30,
          gender: "male",
          phone: "9876543210",
          email: user.email || "patient@gmail.com",
          address: "Demo Address, City",
          status: "stable",
          assignedDoctor: "Dr. Demo",
          medicalHistory: []
        } as Patient)
        setLoading(false)
        return
      }

      try {
        // Find patient by email
        const patientsRef = collection(db, "patients")
        const patientsQuery = query(patientsRef, where("email", "==", user.email))
        const patientsSnapshot = await getDocs(patientsQuery)
        
        if (!patientsSnapshot.empty) {
          const patient = { id: patientsSnapshot.docs[0].id, ...patientsSnapshot.docs[0].data() } as Patient
          setPatientData(patient)

          // Fetch appointments
          const appointmentsRef = collection(db, "appointments")
          const aptQuery = query(appointmentsRef, where("patientId", "==", patient.id))
          const aptSnapshot = await getDocs(aptQuery)
          setAppointments(aptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)))

          // Fetch lab orders
          const labOrdersRef = collection(db, "labOrders")
          const labQuery = query(labOrdersRef, where("patientId", "==", patient.id))
          const labSnapshot = await getDocs(labQuery)
          setLabOrders(labSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabOrder)))

          // Fetch prescriptions
          const prescriptionsRef = collection(db, "prescriptions")
          const rxQuery = query(prescriptionsRef, where("patientId", "==", patient.id))
          const rxSnapshot = await getDocs(rxQuery)
          setPrescriptions(rxSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)))
        } else {
          // Create demo patient if not found
          setPatientData({
            id: "demo-patient-1",
            uhid: "UHID-202601-00001",
            name: user.name || "Demo Patient",
            age: 30,
            gender: "male",
            phone: "9876543210",
            email: user.email || "patient@gmail.com",
            address: "Demo Address, City",
            status: "stable",
            assignedDoctor: "Dr. Demo",
            medicalHistory: []
          } as Patient)
        }
      } catch (error) {
        console.error("Error fetching patient data:", error)
        // Fallback to demo data on error
        setPatientData({
          id: "demo-patient-1",
          uhid: "UHID-202601-00001",
          name: user.name || "Demo Patient",
          age: 30,
          gender: "male",
          phone: "9876543210",
          email: user.email || "patient@gmail.com",
          address: "Demo Address, City",
          status: "stable",
          assignedDoctor: "Dr. Demo",
          medicalHistory: []
        } as Patient)
      } finally {
        setLoading(false)
      }
    }

    fetchPatientData()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!patientData && !loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center p-6">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">Welcome to MedSync</h3>
            <p className="text-gray-500 mb-4">Your patient profile will be created on your first visit to reception.</p>
            <div className="text-sm text-muted-foreground mt-4">
              <p>Demo Mode Active: Using sample patient data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.appointmentDate) >= new Date() && apt.status !== 'cancelled' && apt.status !== 'completed')
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())

  const todayAppointment = upcomingAppointments.find(apt => {
    const aptDate = new Date(apt.appointmentDate)
    const today = new Date()
    return (
      aptDate.getDate() === today.getDate() &&
      aptDate.getMonth() === today.getMonth() &&
      aptDate.getFullYear() === today.getFullYear()
    )
  })

  const pendingLabOrders = labOrders.filter(order => order.status !== 'completed' && order.status !== 'cancelled')
  const pendingPrescriptions = prescriptions.filter(rx => rx.status === 'pending')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Patient Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {patientData?.name || "Patient"}</p>
      </div>

      {/* Patient Info Card */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Your Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Hospital ID (UHID)</p>
              <p className="text-lg font-mono font-bold">{patientData?.uhid || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="font-medium">{patientData?.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned Doctor</p>
              <p className="font-medium">{patientData?.assignedDoctor || 'Not assigned'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Appointments</p>
          </CardContent>
        </Card>

        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLabOrders.length}</div>
            <p className="text-xs text-muted-foreground">Lab Tests</p>
          </CardContent>
        </Card>

        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptions.length}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={patientData?.status === 'critical' ? 'destructive' : 'outline'}>
              {patientData?.status || "stable"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointment */}
      {todayAppointment && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/40 glass-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Today's Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-foreground">Dr. {todayAppointment.doctorName}</p>
                  <p className="text-sm text-muted-foreground">{todayAppointment.department}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {formatTimeSlot(todayAppointment.timeSlot)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={todayAppointment.status === 'scheduled' ? 'default' : todayAppointment.status === 'in-progress' ? 'outline' : 'secondary'}>
                    {todayAppointment.status}
                  </Badge>
                  {todayAppointment.queueNumber && (
                    <p className="text-2xl font-bold mt-2">#{todayAppointment.queueNumber}</p>
                  )}
                  {todayAppointment.status === 'scheduled' && todayAppointment.queueNumber && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Est. wait: ~{estimateWaitTime(todayAppointment.queueNumber, appointments)} min
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Your scheduled consultations</CardDescription>
          </div>
          <Link href="/dashboard/patient/appointments/book">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Book New
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 3).map(apt => (
                <div key={apt.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Dr. {apt.doctorName}</p>
                    <p className="text-sm text-muted-foreground">{apt.department}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(apt.appointmentDate).toLocaleDateString()} • {formatTimeSlot(apt.timeSlot)}
                    </p>
                  </div>
                  <Badge variant="outline">{apt.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No upcoming appointments</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Lab Tests */}
      {pendingLabOrders.length > 0 && (
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle>Pending Lab Tests</CardTitle>
            <CardDescription>Tests ordered by your doctor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingLabOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Order #{order.orderId}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.tests.map(t => t.testName).join(', ')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ordered: {new Date(order.orderedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={order.status === 'pending' ? 'destructive' : 'secondary'}>
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Prescriptions */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle>Recent Prescriptions</CardTitle>
          <CardDescription>Medications prescribed by your doctor</CardDescription>
        </CardHeader>
        <CardContent>
          {prescriptions.length > 0 ? (
            <div className="space-y-3">
              {prescriptions.slice(0, 3).map(rx => (
                <div key={rx.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Dr. {rx.doctorName}</p>
                    <p className="text-sm text-muted-foreground">
                      {rx.medicines.length} medicine(s)
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={rx.status === 'approved' ? 'default' : rx.status === 'pending' ? 'secondary' : 'destructive'}>
                    {rx.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No prescriptions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
