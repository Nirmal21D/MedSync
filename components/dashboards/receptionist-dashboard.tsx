"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Calendar, Bed, Plus, Clock, Phone, Trash, Pencil } from "lucide-react"
import { collection, getDocs, addDoc, setDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, Appointment, Staff } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DialogTrigger } from "@/components/ui/dialog"

// Utility to safely format a date value
function formatDate(dateValue: any) {
  if (!dateValue) return ""
  let dateObj: Date | null = null
  if (dateValue instanceof Date) {
    dateObj = dateValue
  } else if (typeof dateValue === "string" || typeof dateValue === "number") {
    const parsed = new Date(dateValue)
    if (!isNaN(parsed.getTime())) dateObj = parsed
  } else if (typeof dateValue === "object" && dateValue.seconds) {
    // Firestore Timestamp
    dateObj = new Date(dateValue.seconds * 1000)
  }
  return dateObj ? dateObj.toLocaleDateString() : ""
}

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
  const [beds, setBeds] = useState<any[]>([])
  const [showAssignBed, setShowAssignBed] = useState(false)
  const [selectedBedId, setSelectedBedId] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [showDeletePatient, setShowDeletePatient] = useState<Patient | null>(null)
  const [patientSearch, setPatientSearch] = useState("")

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
    getDocs(collection(db, "beds")).then(snapshot => {
      setBeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
  }, [])

  const todayAppointments = appointments.filter(
    (a) => {
      // Defensive: ensure a.date is a valid date
      let apptDate: Date | null = null;
      if (a.date instanceof Date) {
        apptDate = a.date;
      } else if (typeof a.date === "string" || typeof a.date === "number") {
        apptDate = new Date(a.date);
      } else if (a.date && typeof a.date === "object" && 'seconds' in a.date) {
        // Firestore Timestamp
        apptDate = new Date((a.date as { seconds: number }).seconds * 1000);
      }
      return apptDate && apptDate.toDateString() === new Date().toDateString();
    }
  )
  const occupiedBeds = patients.filter((p) => p.assignedBed).length
  const doctors = staff.filter((s) => s.role === "doctor")

  const availableBedsList = beds.filter((b) => b.status === "available")
  const unassignedPatients = patients.filter((p) => !p.assignedBed)

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  )

  const handleAddPatient = async () => {
    if (!db) return;
    // Validate required fields
    if (!newPatient.name || !newPatient.age || !newPatient.gender || !newPatient.assignedDoctor) {
      alert("Please fill all required fields, including assigning a doctor.");
      return;
    }
    try {
      await addDoc(collection(db, "patients"), {
        ...newPatient,
        age: Number(newPatient.age),
        createdAt: new Date(),
      });
      // Refresh patient list
      const snapshot = await getDocs(collection(db, "patients"));
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
      setNewPatient({
        name: "",
        age: "",
        gender: "",
        phone: "",
        address: "",
        assignedDoctor: "",
      });
      setShowAddPatient(false);
    } catch (err) {
      alert("Failed to add patient. Please try again.");
    }
  }

  const handleAssignBed = async () => {
    if (!db || !selectedBedId || !selectedPatientId) return
    const bed = beds.find((b) => b.id === selectedBedId)
    const patient = patients.find((p) => p.id === selectedPatientId)
    if (!bed || !patient) return
    // Update bed in Firestore
    await setDoc(doc(db, "beds", bed.id), {
      ...bed,
      status: "occupied",
      patientId: patient.id,
      patientName: patient.name,
    })
    // Optionally update patient in Firestore
    await setDoc(doc(db, "patients", patient.id), {
      ...patient,
      assignedBed: bed.number,
    }, { merge: true })
    // Refresh lists
    const bedsSnap = await getDocs(collection(db, "beds"))
    setBeds(bedsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    const patientsSnap = await getDocs(collection(db, "patients"))
    setPatients(patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    setShowAssignBed(false)
    setSelectedBedId("")
    setSelectedPatientId("")
  }

  const handleUpdatePatient = async (updated: Patient) => {
    if (!db) return
    await setDoc(doc(db, "patients", updated.id), updated, { merge: true })
    const snapshot = await getDocs(collection(db, "patients"))
    setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))
    setEditPatient(null)
  }

  const handleDeletePatient = async (patient: Patient) => {
    if (!db) return
    await deleteDoc(doc(db, "patients", patient.id))
    setPatients(patients.filter((p) => p.id !== patient.id))
    setShowDeletePatient(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Receptionist Dashboard</h1>
        <p className="text-muted-foreground">Patient registration and appointment management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{patients.length}</div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled today</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Available Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{availableBedsList.length}</div>
            <p className="text-xs text-muted-foreground">Out of {beds.length} total</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Occupied Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">Currently occupied</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
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

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
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

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Bed className="mr-2 h-5 w-5" />
              Assign Bed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowAssignBed(true)}>
              Manage Beds
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Add Patient Form */}
      {showAddPatient && (
        <Card className="bg-card">
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
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <Clock className="mr-2 h-5 w-5" />
            Today's Appointments
          </CardTitle>
          <CardDescription className="text-muted-foreground">Scheduled appointments for today</CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{appointment.patientName}</p>
                    <p className="text-sm text-muted-foreground">Dr. {appointment.doctorName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{appointment.time}</p>
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
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No appointments scheduled for today</p>
          )}
        </CardContent>
      </Card>

      {/* Bed Management */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="flex items-center">
              <Bed className="mr-2 h-5 w-5" />
              Bed Management
            </span>
            <Button size="sm" variant="outline">
              View All Beds
            </Button>
          </CardTitle>
          <CardDescription className="text-muted-foreground">Current bed occupancy status</CardDescription>
        </CardHeader>
        <CardContent>
          {beds.length === 0 ? (
            <div className="text-center text-red-500 font-semibold py-8">
              No beds found in the system.<br />
              Please add beds in Firestore to see them here.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-300">{availableBedsList.length}</p>
                  <p className="text-sm text-green-700 dark:text-green-200">Available</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{occupiedBeds}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-200">Occupied</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{beds.length}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">Total</p>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Patients */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span>Recent Patients</span>
            <Button size="sm" variant="outline">
              View All
            </Button>
          </CardTitle>
          <CardDescription className="text-muted-foreground">Recently registered patients</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search patients by name..."
            value={patientSearch}
            onChange={e => setPatientSearch(e.target.value)}
            className="mb-4 w-full"
          />
          <div className="space-y-3">
            {filteredPatients.slice(0, 5).map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Age: {patient.age} • {patient.gender}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {patient.phone}
                  </p>
                </div>
                <div className="text-right flex flex-col gap-2 items-end">
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
                  <div className="flex gap-2 mt-2">
                    <Button size="icon" variant="ghost" onClick={() => setEditPatient(patient)} title="Edit patient">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setShowDeletePatient(patient)} title="Delete patient">
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Patient Modal */}
      {editPatient && (
        <Dialog open={!!editPatient} onOpenChange={() => setEditPatient(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Label>Name</Label>
              <Input value={editPatient.name} onChange={e => setEditPatient({ ...editPatient, name: e.target.value })} />
              <Label>Age</Label>
              <Input type="number" value={editPatient.age} onChange={e => setEditPatient({ ...editPatient, age: Number(e.target.value) })} />
              <Label>Gender</Label>
              <Select value={editPatient.gender} onValueChange={value => setEditPatient({ ...editPatient, gender: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Label>Phone</Label>
              <Input value={editPatient.phone} onChange={e => setEditPatient({ ...editPatient, phone: e.target.value })} />
              <Label>Address</Label>
              <Input value={editPatient.address} onChange={e => setEditPatient({ ...editPatient, address: e.target.value })} />
              <Label>Assigned Doctor</Label>
              <Select value={editPatient.assignedDoctor} onValueChange={value => setEditPatient({ ...editPatient, assignedDoctor: value })}>
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
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditPatient(null)}>Cancel</Button>
                <Button onClick={() => handleUpdatePatient(editPatient)}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Patient Confirmation */}
      {showDeletePatient && (
        <Dialog open={!!showDeletePatient} onOpenChange={() => setShowDeletePatient(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Patient</DialogTitle>
            </DialogHeader>
            <div className="py-4">Are you sure you want to delete <b>{showDeletePatient.name}</b>?</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeletePatient(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDeletePatient(showDeletePatient)}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Assign Bed Modal */}
      <Dialog open={showAssignBed} onOpenChange={setShowAssignBed}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Bed to Patient</DialogTitle>
            <DialogDescription>Select an available bed and a patient to assign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Available Bed</Label>
              <Select value={selectedBedId} onValueChange={setSelectedBedId} disabled={availableBedsList.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={availableBedsList.length === 0 ? "No beds available" : "Select bed"} />
                </SelectTrigger>
                <SelectContent>
                  {availableBedsList.length === 0 ? (
                    <div className="px-4 py-2 text-gray-500">No available beds</div>
                  ) : (
                    availableBedsList.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>{bed.number} ({bed.ward})</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId} disabled={unassignedPatients.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={unassignedPatients.length === 0 ? "No unassigned patients" : "Select patient"} />
                </SelectTrigger>
                <SelectContent>
                  {unassignedPatients.length === 0 ? (
                    <div className="px-4 py-2 text-gray-500">No unassigned patients</div>
                  ) : (
                    unassignedPatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>{patient.name} ({patient.age} yrs)</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignBed(false)}>Cancel</Button>
              <Button onClick={handleAssignBed} disabled={!selectedBedId || !selectedPatientId || availableBedsList.length === 0 || unassignedPatients.length === 0}>Assign Bed</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
