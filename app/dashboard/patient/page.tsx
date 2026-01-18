"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, FileText, Activity, User, Clock, Mic, QrCode } from "lucide-react"
import Link from "next/link"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, Appointment } from "@/lib/types"
import PatientBarcodeCard from "@/components/PatientBarcodeCard"

export default function PatientDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [patientData, setPatientData] = useState<Patient | null>(null)
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      if (!db) {
        // Demo mode
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
          medicalHistory: []
        } as Patient)
        
        setUpcomingAppointments([
          {
            id: "apt1",
            patientId: "demo-patient-1",
            patientName: user.name || "Demo Patient",
            doctorId: "doc1",
            doctorName: "Dr. Smith",
            department: "Cardiology",
            appointmentDate: new Date(Date.now() + 86400000),
            timeSlot: "10:00",
            status: "scheduled",
            type: "consultation",
            reason: "Regular checkup"
          } as any
        ])
        
        setLoadingData(false)
        return
      }

      try {
        // Fetch patient data
        const patientsRef = collection(db, "patients")
        const patientsQuery = query(patientsRef, where("email", "==", user.email))
        const patientsSnapshot = await getDocs(patientsQuery)
        
        if (!patientsSnapshot.empty) {
          const patient = { id: patientsSnapshot.docs[0].id, ...patientsSnapshot.docs[0].data() } as Patient
          setPatientData(patient)

          // Fetch upcoming appointments
          const appointmentsRef = collection(db, "appointments")
          const aptQuery = query(
            appointmentsRef,
            where("patientId", "==", patient.id),
            where("status", "in", ["scheduled", "confirmed"])
          )
          const aptSnapshot = await getDocs(aptQuery)
          const appointments = aptSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
            .filter(apt => new Date(apt.appointmentDate) >= new Date())
            .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
          
          setUpcomingAppointments(appointments.slice(0, 3))
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [user])

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome, {patientData?.name || user.name || "Patient"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {patientData?.uhid ? `UHID: ${patientData.uhid}` : "Manage your healthcare"}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/patient/appointments/book">
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
            <CardHeader>
              <Calendar className="h-8 w-8 text-emerald-600 mb-2" />
              <CardTitle className="text-lg">Book Appointment</CardTitle>
              <CardDescription>Schedule a consultation</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/patient/voice-booking">
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
            <CardHeader>
              <Mic className="h-8 w-8 text-violet-600 mb-2" />
              <CardTitle className="text-lg">Voice Booking</CardTitle>
              <CardDescription>Book via AI assistant</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/patient/appointments">
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
            <CardHeader>
              <Clock className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">My Appointments</CardTitle>
              <CardDescription>View your schedule</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg h-full">
          <CardHeader>
            <Activity className="h-8 w-8 text-orange-600 mb-2" />
            <CardTitle className="text-lg">Health Status</CardTitle>
            <CardDescription>
              {patientData?.status ? (
                <span className="capitalize">{patientData.status}</span>
              ) : (
                "Track your health"
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
          <CardDescription>Your scheduled consultations</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-semibold">{apt.doctorName}</p>
                    <p className="text-sm text-muted-foreground">{apt.department}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.timeSlot}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
              <Link href="/dashboard/patient/appointments">
                <Button variant="outline" className="w-full">View All Appointments</Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No upcoming appointments</p>
              <Link href="/dashboard/patient/appointments/book">
                <Button>Book Your First Appointment</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Information */}
      {patientData && (
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{patientData.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">UHID</p>
                <p className="font-semibold font-mono">{patientData.uhid}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age / Gender</p>
                <p className="font-semibold">{patientData.age}Y / {patientData.gender}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-semibold">{patientData.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{patientData.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{patientData.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Barcode Card - Show this to staff for identification */}
      {patientData && patientData.uhid && (
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Your Identification Card
            </CardTitle>
            <CardDescription>
              Show this barcode to hospital staff for quick identification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientBarcodeCard patient={patientData} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
