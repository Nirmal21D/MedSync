"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, MapPin, Phone, X, AlertCircle } from "lucide-react"
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { Patient, Appointment } from "@/lib/types"
import { formatTimeSlot, getAppointmentStatusColor, estimateWaitTime } from "@/lib/appointments"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function MyAppointmentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [patientData, setPatientData] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const formatAppointmentDate = (date: any) => {
    if (!date) return "Date not set"
    try {
      const dateObj = date instanceof Date ? date : new Date(date.seconds ? date.seconds * 1000 : date)
      return dateObj.toLocaleDateString()
    } catch (error) {
      return "Invalid date"
    }
  }

  useEffect(() => {
    const fetchData = async () => {
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
          medicalHistory: []
        } as Patient)
        
        // Demo appointments
        setAppointments([
          {
            id: "apt-demo-1",
            uhid: "UHID-202601-00001",
            patientId: "demo-patient-1",
            patientName: user.name || "Demo Patient",
            patientPhone: "9876543210",
            doctorId: "doc1",
            doctorName: "Dr. Smith",
            department: "Cardiology",
            appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            timeSlot: "10:00",
            type: "consultation",
            status: "scheduled",
            reason: "Regular checkup",
            createdAt: new Date(),
            createdBy: "demo",
            queueNumber: 3,
            voiceBooked: false
          }
        ] as Appointment[])
        
        setLoading(false)
        return
      }

      try {
        const patientsRef = collection(db, "patients")
        const patientsQuery = query(patientsRef, where("email", "==", user.email))
        const patientsSnapshot = await getDocs(patientsQuery)
        
        if (!patientsSnapshot.empty) {
          const patient = { id: patientsSnapshot.docs[0].id, ...patientsSnapshot.docs[0].data() } as Patient
          setPatientData(patient)

          // Fetch appointments - try both patientId and email for compatibility
          const appointmentsRef = collection(db, "appointments")
          const aptQuery = query(appointmentsRef, where("patientId", "==", patient.id))
          const aptSnapshot = await getDocs(aptQuery)
          
          let appointmentsList = aptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
          
          // If no appointments found by patientId, try by email
          if (appointmentsList.length === 0) {
            const aptQueryByEmail = query(appointmentsRef, where("patientEmail", "==", user.email))
            const aptSnapshotByEmail = await getDocs(aptQueryByEmail)
            appointmentsList = aptSnapshotByEmail.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
          }
          
          // If still no appointments, try by UHID
          if (appointmentsList.length === 0 && patient.uhid) {
            const aptQueryByUHID = query(appointmentsRef, where("uhid", "==", patient.uhid))
            const aptSnapshotByUHID = await getDocs(aptQueryByUHID)
            appointmentsList = aptSnapshotByUHID.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
          }
          
          setAppointments(
            appointmentsList.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
          )
        } else {
          // Create demo patient
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
        }
      } catch (error) {
        console.error("Error fetching appointments:", error)
        // Fallback to demo data
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
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      if (db) {
        const aptRef = doc(db, "appointments", appointmentId)
        await updateDoc(aptRef, {
          status: "cancelled"
        })
      }

      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentId ? { ...apt, status: "cancelled" as const } : apt
        )
      )

      toast({
        title: "Appointment Cancelled",
        description: `Your appointment has been cancelled successfully${!db ? ' (Demo Mode)' : ''}`,
      })
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Helper to safely convert Firestore timestamp to Date
  const getAppointmentDate = (date: any): Date => {
    if (!date) return new Date(0)
    if (date instanceof Date) return date
    if (date.seconds) return new Date(date.seconds * 1000)
    return new Date(date)
  }

  const upcomingAppointments = appointments.filter(
    apt => getAppointmentDate(apt.appointmentDate) >= new Date() && apt.status !== 'cancelled' && apt.status !== 'completed'
  )

  const pastAppointments = appointments.filter(
    apt => getAppointmentDate(apt.appointmentDate) < new Date() || apt.status === 'completed' || apt.status === 'cancelled'
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">View and manage your appointments</p>
        </div>
        <Link href="/dashboard/patient/appointments/book">
          <Button>Book New Appointment</Button>
        </Link>
      </div>

      {/* Upcoming Appointments */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your scheduled consultations</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map(apt => (
                <Card key={apt.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <User className="h-5 w-5" />
                              Dr. {apt.doctorName}
                            </h3>
                            <p className="text-sm text-muted-foreground">{apt.department}</p>
                          </div>
                          <Badge variant={apt.status === 'scheduled' ? 'default' : apt.status === 'in-progress' ? 'outline' : 'secondary'}>
                            {apt.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{getAppointmentDate(apt.appointmentDate).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{formatTimeSlot(apt.timeSlot)}</span>
                          </div>
                        </div>

                        {apt.queueNumber && (
                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div>
                              <p className="text-sm text-muted-foreground">Queue Number</p>
                              <p className="text-2xl font-bold">#{apt.queueNumber}</p>
                            </div>
                            {apt.status === 'scheduled' && (
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Estimated Wait</p>
                                <p className="text-lg font-semibold">~{estimateWaitTime(apt.queueNumber, appointments)} min</p>
                              </div>
                            )}
                          </div>
                        )}

                        {apt.reason && (
                          <div>
                            <p className="text-sm text-muted-foreground">Reason:</p>
                            <p className="text-sm">{apt.reason}</p>
                          </div>
                        )}

                        {apt.voiceBooked && (
                          <Badge variant="outline" className="w-fit">
                            <Phone className="h-3 w-3 mr-1" />
                            Booked via Voice
                          </Badge>
                        )}
                      </div>

                      {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancellingId(apt.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-muted-foreground">No upcoming appointments</p>
              <Link href="/dashboard/patient/appointments/book">
                <Button variant="outline" className="mt-4">Book Your First Appointment</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle>Past Appointments</CardTitle>
            <CardDescription>Your appointment history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastAppointments.map(apt => (
                <div key={apt.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Dr. {apt.doctorName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAppointmentDate(apt.appointmentDate)} • {formatTimeSlot(apt.timeSlot)}
                    </p>
                  </div>
                  <Badge variant={apt.status === 'completed' ? 'default' : apt.status === 'cancelled' ? 'destructive' : 'secondary'}>
                    {apt.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancellingId} onOpenChange={() => setCancellingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
              Please cancel at least 24 hours in advance when possible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancellingId && handleCancelAppointment(cancellingId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
