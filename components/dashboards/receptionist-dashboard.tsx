"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Calendar, Bed, Plus, Clock, Phone } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, Appointment, Staff } from "@/lib/types"

export default function ReceptionistDashboard() {
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    address: "",
    assignedDoctor: "",
  })
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const availableBeds = 25 // Still static unless you want to fetch from Firestore

  useEffect(() => {
    if (!db) return
    getDocs(collection(db, "patients")).then(snapshot => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))
    })
    getDocs(collection(db, "appointments")).then(snapshot => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)))
    })
    getDocs(collection(db, "users")).then(snapshot => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)))
    })
  }, [])

  const todayAppointments = appointments.filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString(),
  )
  const occupiedBeds = patients.filter((p) => p.assignedBed).length
  const doctors = staff.filter((s) => s.role === "doctor")

  const handleAddPatient = () => {
    // In real app, save to database
    console.log("Adding new patient:", newPatient)
    setNewPatient({
      name: "",
      age: "",
      gender: "",
      phone: "",
      address: "",
      assignedDoctor: "",
    })
    setShowAddPatient(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Receptionist Dashboard</h1>
        <p className="text-gray-600">Patient registration and appointment management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableBeds - occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">Out of {availableBeds} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">Currently occupied</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Add New Patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAddPatient(true)} className="w-full">
              Register Patient
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Schedule Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent">
              New Appointment
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bed className="mr-2 h-5 w-5" />
              Assign Bed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent">
              Manage Beds
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Add Patient Form */}
      {showAddPatient && (
        <Card>
          <CardHeader>
            <CardTitle>Register New Patient</CardTitle>
            <CardDescription>Enter patient information for registration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="Enter patient name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={newPatient.age}
                  onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                  placeholder="Enter age"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={newPatient.gender}
                  onValueChange={(value) => setNewPatient({ ...newPatient, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor">Assign Doctor</Label>
                <Select
                  value={newPatient.assignedDoctor}
                  onValueChange={(value) => setNewPatient({ ...newPatient, assignedDoctor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.name}>
                        {doctor.name} - {doctor.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <Button onClick={handleAddPatient} className="flex-1">
                Register Patient
              </Button>
              <Button variant="outline" onClick={() => setShowAddPatient(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Today's Appointments
          </CardTitle>
          <CardDescription>Scheduled appointments for today</CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{appointment.patientName}</p>
                    <p className="text-sm text-gray-600">Dr. {appointment.doctorName}</p>
                    <p className="text-sm text-gray-500">{appointment.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{appointment.time}</p>
                    <Badge
                      variant={
                        appointment.status === "scheduled"
                          ? "default"
                          : appointment.status === "completed"
                            ? "secondary"
                            : "destructive"
                      }
                    >
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

      {/* Bed Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Bed className="mr-2 h-5 w-5" />
              Bed Management
            </span>
            <Button size="sm" variant="outline">
              View All Beds
            </Button>
          </CardTitle>
          <CardDescription>Current bed occupancy status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{availableBeds - occupiedBeds}</p>
              <p className="text-sm text-green-700">Available</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{occupiedBeds}</p>
              <p className="text-sm text-blue-700">Occupied</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{availableBeds}</p>
              <p className="text-sm text-gray-700">Total</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Occupied Beds</h4>
            {patients
              .filter((p) => p.assignedBed)
              .map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-gray-600">{patient.diagnosis}</p>
                  </div>
                  <Badge variant="outline">{patient.assignedBed}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Patients</span>
            <Button size="sm" variant="outline">
              View All
            </Button>
          </CardTitle>
          <CardDescription>Recently registered patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patients.slice(0, 5).map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-sm text-gray-600">
                    Age: {patient.age} • {patient.gender}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {patient.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{patient.assignedDoctor}</p>
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
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
