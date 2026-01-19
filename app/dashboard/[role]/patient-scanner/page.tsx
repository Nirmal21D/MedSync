"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Camera, Search, User, FileText, Calendar, Activity, Pill, TestTube, AlertCircle, Plus } from "lucide-react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, Prescription, Appointment } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function PatientScannerPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  
  const [uhidInput, setUhidInput] = useState("")
  const [scanning, setScanning] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  const searchPatient = async () => {
    if (!uhidInput.trim()) return

    setSearching(true)
    try {
      if (!db) {
        // Demo mode
        setPatient({
          id: "demo-patient-1",
          uhid: uhidInput,
          name: "John Doe",
          age: 35,
          gender: "male",
          phone: "9876543210",
          email: "john@demo.com",
          address: "123 Demo Street, Mumbai",
          status: "stable",
          diagnosis: "Hypertension",
          history: ["Diabetes Type 2 (2020)", "Hypertension (2022)"],
          vitals: {
            bloodPressure: "130/85",
            heartRate: 78,
            temperature: 98.6,
            oxygenSaturation: 98
          },
          medicalHistory: [
            { condition: "Diabetes Type 2", diagnosedDate: "2020-05-15", notes: "Controlled with medication" },
            { condition: "Hypertension", diagnosedDate: "2022-03-20", notes: "Monitoring required" }
          ]
        } as Patient)
        
        setPrescriptions([
          {
            id: "rx1",
            patientId: "demo-patient-1",
            patientName: "John Doe",
            doctorId: "doc1",
            doctorName: "Dr. Smith",
            medicines: [
              { name: "Metformin 500mg", dosage: "500mg", frequency: "Twice daily", duration: "30 days" },
              { name: "Amlodipine 5mg", dosage: "5mg", frequency: "Once daily", duration: "30 days" }
            ],
            status: "approved",
            createdAt: new Date("2024-12-15"),
            notes: "Continue current medication"
          }
        ] as Prescription[])
        
        setAppointments([
          {
            id: "apt1",
            patientId: "demo-patient-1",
            patientName: "John Doe",
            doctorId: "doc1",
            doctorName: "Dr. Smith",
            department: "Cardiology",
            date: new Date("2024-12-20"),
            timeSlot: "10:00",
            status: "completed",
            type: "consultation",
            reason: "Follow-up checkup"
          } as any
        ])
        
        setSearching(false)
        return
      }

      // Search by UHID
      const patientsRef = collection(db, "patients")
      const q = query(patientsRef, where("uhid", "==", uhidInput.toUpperCase()))
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const patientData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Patient
        setPatient(patientData)

        // Fetch prescriptions
        const rxRef = collection(db, "prescriptions")
        const rxQuery = query(rxRef, where("patientId", "==", patientData.id))
        const rxSnapshot = await getDocs(rxQuery)
        setPrescriptions(rxSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)))

        // Fetch appointments
        const aptRef = collection(db, "appointments")
        const aptQuery = query(aptRef, where("patientId", "==", patientData.id))
        const aptSnapshot = await getDocs(aptQuery)
        setAppointments(aptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)))
      } else {
        setPatient(null)
        alert("Patient not found with UHID: " + uhidInput)
      }
    } catch (error) {
      console.error("Error searching patient:", error)
      alert("Error searching for patient")
    } finally {
      setSearching(false)
    }
  }

  const handleScan = () => {
    // In a real implementation, this would open the device camera
    // For now, we'll use manual input
    alert("Barcode scanner would open here. For demo, please enter UHID manually.")
  }

  if (loading) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={role}>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Patient Scanner</h1>
          <p className="text-muted-foreground">Scan UHID barcode or search manually to view patient information</p>
        </div>

        {/* Search Section */}
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Patient
            </CardTitle>
            <CardDescription>Enter UHID or scan patient barcode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Enter UHID (e.g., UHID-202601-00001)"
                  value={uhidInput}
                  onChange={(e) => setUhidInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && searchPatient()}
                  className="text-lg"
                />
              </div>
              <Button onClick={handleScan} variant="outline" size="lg">
                <Camera className="mr-2 h-4 w-4" />
                Scan Barcode
              </Button>
              <Button onClick={searchPatient} disabled={searching || !uhidInput.trim()} size="lg">
                <Search className="mr-2 h-4 w-4" />
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Patient Information */}
        {patient && (
          <div className="space-y-6">
            {/* Patient Header */}
            <Card className="glass-card bg-gradient-to-r from-emerald-50 to-violet-50 dark:from-emerald-900/20 dark:to-violet-900/20 backdrop-blur-xl shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{patient.name}</h2>
                      <p className="text-muted-foreground">UHID: {patient.uhid}</p>
                      <div className="flex gap-4 mt-2">
                        <Badge variant="outline">{patient.age} years</Badge>
                        <Badge variant="outline"className="capitalize">{patient.gender}</Badge>
                        <Badge variant={patient.status === "critical" ? "destructive" : "default"}>
                          {patient.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/dashboard/${role}/prescriptions?patientId=${patient.id}&patientName=${patient.name}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Prescription
                    </Link>
                  </Button>
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{patient.email || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{patient.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vitals */}
            {patient.vitals && (
              <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Current Vitals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Blood Pressure</p>
                      <p className="text-2xl font-bold">{patient.vitals.bloodPressure}</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Heart Rate</p>
                      <p className="text-2xl font-bold">{patient.vitals.heartRate} bpm</p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Temperature</p>
                      <p className="text-2xl font-bold">{patient.vitals.temperature}°F</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">O2 Saturation</p>
                      <p className="text-2xl font-bold">{patient.vitals.oxygenSaturation}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medical History Tabs */}
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardContent className="pt-6">
                <Tabs defaultValue="history">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="history">Medical History</TabsTrigger>
                    <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
                    <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="history" className="space-y-4">
                    {patient.diagnosis && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Current Diagnosis:</strong> {patient.diagnosis}
                        </AlertDescription>
                      </Alert>
                    )}
                    {patient.history && patient.history.length > 0 ? (
                      <div className="space-y-3">
                        {patient.history.map((item, index) => {
                          const displayText = typeof item === 'string' 
                            ? item 
                            : (item as any)?.name || JSON.stringify(item)
                          return (
                            <Card key={index} className="border-l-4 border-l-blue-500">
                              <CardContent className="pt-4">
                                <p className="font-medium">{displayText}</p>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No medical history recorded</p>
                    )}
                  </TabsContent>

                  <TabsContent value="prescriptions" className="space-y-4">
                    {prescriptions.length > 0 ? (
                      prescriptions.map((rx) => (
                        <Card key={rx.id} className="border-l-4 border-l-emerald-500">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{rx.doctorName}</CardTitle>
                                <CardDescription>
                                  {new Date(rx.createdAt).toLocaleDateString()}
                                </CardDescription>
                              </div>
                              <Badge variant={rx.status === "approved" ? "default" : "secondary"}>
                                {rx.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {rx.medicines.map((med, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Pill className="h-4 w-4 mt-1 text-emerald-600" />
                                <div>
                                  <p className="font-medium">{med.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {med.dosage} - {med.frequency} - {med.duration}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {rx.notes && (
                              <p className="text-sm text-muted-foreground mt-2">Note: {rx.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No prescriptions found</p>
                    )}
                  </TabsContent>

                  <TabsContent value="appointments" className="space-y-4">
                    {appointments.length > 0 ? (
                      appointments.map((apt) => (
                        <Card key={apt.id} className="border-l-4 border-l-violet-500">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{apt.doctorName}</p>
                                <p className="text-sm text-muted-foreground">{apt.department}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.timeSlot}
                                </p>
                                {apt.reason && (
                                  <p className="text-sm mt-2">Reason: {apt.reason}</p>
                                )}
                              </div>
                              <Badge variant={apt.status === "completed" ? "default" : "secondary"}>
                                {apt.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No appointments found</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
