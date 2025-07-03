"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, FileText, Clock, AlertCircle, Plus } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, Appointment, Prescription } from "@/lib/types"
import { useAuth } from "@/components/providers/auth-provider"

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [myPatients, setMyPatients] = useState<Patient[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([])
  const [criticalPatients, setCriticalPatients] = useState<Patient[]>([])
  const doctorName = user?.displayName || user?.name || "Dr. Sarah Johnson";

  useEffect(() => {
    if (!db) return
    // Fetch patients
    getDocs(collection(db, "patients")).then(snapshot => {
      const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient))
      const mine = patients.filter((p) => p.assignedDoctor === doctorName)
      setMyPatients(mine)
      setCriticalPatients(mine.filter((p) => p.status === "critical"))
    })
    // Fetch appointments
    getDocs(collection(db, "appointments")).then(snapshot => {
      const today = new Date().toDateString()
      const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
      setTodayAppointments(
        appointments.filter(
          (a) => a.doctorName === doctorName && new Date(a.date).toDateString() === today
        )
      )
    })
    // Fetch prescriptions
    getDocs(collection(db, "prescriptions")).then(snapshot => {
      const prescriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription))
      setPendingPrescriptions(
        prescriptions.filter((p) => p.doctorName === doctorName && p.status === "pending")
      )
    })
  }, [doctorName])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-600">Patient care and medical management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myPatients.length}</div>
            <p className="text-xs text-muted-foreground">{criticalPatients.length} critical</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPrescriptions.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting pharmacy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalPatients.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Patients Alert */}
      {criticalPatients.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Critical Patients
            </CardTitle>
            <CardDescription className="text-red-600">Patients requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-gray-600">{patient.diagnosis}</p>
                    <p className="text-sm text-gray-500">Bed: {patient.assignedBed}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">Critical</Badge>
                    <p className="text-sm text-gray-500 mt-1">Temp: {patient.vitals.temperature}°F</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Today's Schedule
            </span>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Appointment
            </Button>
          </CardTitle>
          <CardDescription>Your appointments for today</CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{appointment.patientName}</p>
                    <p className="text-sm text-gray-600">{appointment.type}</p>
                    {appointment.notes && <p className="text-sm text-gray-500">{appointment.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{appointment.time}</p>
                    <Badge variant={appointment.status === "scheduled" ? "default" : "secondary"}>
                      {appointment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No appointments scheduled for today</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>My Patients</span>
            <Button size="sm" variant="outline">
              View All
            </Button>
          </CardTitle>
          <CardDescription>Patients under your care</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myPatients.slice(0, 5).map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-sm text-gray-600">{patient.diagnosis}</p>
                  <p className="text-sm text-gray-500">
                    Age: {patient.age} • Bed: {patient.assignedBed}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      patient.status === "critical"
                        ? "destructive"
                        : patient.status === "admitted"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {patient.status}
                  </Badge>
                  <p className="text-sm text-gray-500 mt-1">BP: {patient.vitals?.bloodPressure ?? "N/A"}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <FileText className="h-6 w-6 mb-2" />
              New Prescription
            </Button>
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <Users className="h-6 w-6 mb-2" />
              Patient Records
            </Button>
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <Calendar className="h-6 w-6 mb-2" />
              Schedule Appointment
            </Button>
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <FileText className="h-6 w-6 mb-2" />
              Lab Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
