"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, User, FileText, Receipt, Download, AlertCircle, CheckCircle } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Appointment, Prescription } from "@/lib/types"
import { formatTimeSlot } from "@/lib/appointments"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

export default function PatientAppointmentsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    fetchData()
  }, [user, loading, router])

  const fetchData = async () => {
    if (!user || !db) {
      setLoadingData(false)
      return
    }

    try {
      // Fetch patient's appointments
      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("patientId", "==", user.uid)
      )
      const aptSnapshot = await getDocs(appointmentsQuery)
      const aptList = aptSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appointmentDate: doc.data().appointmentDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as Appointment))
      setAppointments(aptList.sort((a, b) => b.appointmentDate.getTime() - a.appointmentDate.getTime()))

      // Fetch patient's prescriptions by patientId or patientUhid
      const prescriptionsQuery = query(
        collection(db, "prescriptions"),
        where("patientId", "==", user.uid)
      )
      const rxSnapshot = await getDocs(prescriptionsQuery)
      const rxList = rxSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as Prescription))
      setPrescriptions(rxList)
      
      console.log('Loaded appointments:', aptList.length)
      console.log('Loaded prescriptions:', rxList.length)
      console.log('Appointments with prescriptionId:', aptList.filter(a => a.prescriptionId).length)

    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const getPrescriptionForAppointment = (appointmentId: string) => {
    return prescriptions.find(rx => rx.appointmentId === appointmentId)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === "scheduled" || apt.status === "in-progress"
  )
  const completedAppointments = appointments.filter(apt => apt.status === "completed")

  return (
    <DashboardLayout role={role}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">View your appointments and prescriptions</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{upcomingAppointments.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedAppointments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map(apt => (
                <Card key={apt.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">Dr. {apt.doctorName}</h3>
                            <p className="text-sm text-muted-foreground">{apt.department}</p>
                          </div>
                          <Badge variant={apt.status === "in-progress" ? "default" : "secondary"}>
                            {apt.status === "in-progress" ? "In Progress" : "Scheduled"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(apt.appointmentDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatTimeSlot(apt.timeSlot)}</span>
                          </div>
                        </div>

                        {apt.reason && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm"><strong>Symptoms:</strong> {apt.reason}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline">Queue #{apt.queueNumber}</Badge>
                          {apt.voiceBooked && <Badge variant="outline">Voice Booked</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No upcoming appointments</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => router.push(`/dashboard/${role}/appointments/book`)}
                  >
                    Book Appointment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedAppointments.length > 0 ? (
              completedAppointments.map(apt => {
                const prescription = getPrescriptionForAppointment(apt.id)
                return (
                  <Card key={apt.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">Dr. {apt.doctorName}</h3>
                              <p className="text-sm text-muted-foreground">{apt.department}</p>
                            </div>
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(apt.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatTimeSlot(apt.timeSlot)}</span>
                            </div>
                          </div>

                          {apt.consultationNotes && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <p className="text-sm font-medium mb-1">Consultation Notes:</p>
                              <p className="text-sm">{apt.consultationNotes}</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            {prescription && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPrescription(prescription)
                                  setShowPrescriptionDialog(true)
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View Prescription
                              </Button>
                            )}
                            {apt.billId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/${role}/billing`)}
                              >
                                <Receipt className="h-4 w-4 mr-2" />
                                View Bill
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No completed appointments yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {appointments.length > 0 ? (
              appointments.map(apt => {
                const prescription = getPrescriptionForAppointment(apt.id)
                return (
                  <Card key={apt.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">Dr. {apt.doctorName}</h3>
                              <p className="text-sm text-muted-foreground">{apt.department}</p>
                            </div>
                            <Badge variant={
                              apt.status === "completed" ? "default" :
                              apt.status === "in-progress" ? "secondary" :
                              apt.status === "cancelled" ? "destructive" : "outline"
                            }>
                              {apt.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(apt.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatTimeSlot(apt.timeSlot)}</span>
                            </div>
                          </div>

                          {apt.status === "completed" && (
                            <div className="flex gap-2">
                              {prescription && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPrescription(prescription)
                                    setShowPrescriptionDialog(true)
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Prescription
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No appointments found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Prescription Dialog */}
        <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Prescription Details
              </DialogTitle>
              <DialogDescription>
                Prescribed by Dr. {selectedPrescription?.doctorName}
              </DialogDescription>
            </DialogHeader>

            {selectedPrescription && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Patient:</span>
                      <p className="font-medium">{selectedPrescription.patientName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">UHID:</span>
                      <p className="font-medium">{selectedPrescription.patientUhid}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium">{formatDate(selectedPrescription.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline">{selectedPrescription.status}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Medicines Prescribed</h4>
                  <div className="space-y-2">
                    {selectedPrescription.medicines.map((med, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <p className="font-medium">{med.name}</p>
                        <div className="grid grid-cols-3 gap-2 mt-1 text-sm text-muted-foreground">
                          <span>Dosage: {med.dosage}</span>
                          <span>Frequency: {med.frequency}</span>
                          <span>Duration: {med.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPrescription.labTests && selectedPrescription.labTests.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Recommended Lab Tests</h4>
                    <div className="space-y-2">
                      {selectedPrescription.labTests.map((test, idx) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <p className="font-medium">{test}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPrescription.notes && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm font-medium mb-1">Additional Notes:</p>
                    <p className="text-sm">{selectedPrescription.notes}</p>
                  </div>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download Prescription
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Receipt className="h-4 w-4 mr-2" />
                    Buy from Hospital Pharmacy
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
