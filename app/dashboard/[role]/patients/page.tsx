"use client"

import type React from "react"

import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Eye, FileText, Heart, Phone, MapPin, Calendar, Activity } from "lucide-react"
import { mockPatients, type Patient } from "@/lib/mock-data"

export default function PatientsPage({ params }: { params: { role: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = params
  const [patients, setPatients] = useState<Patient[]>(mockPatients)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showAddPatient, setShowAddPatient] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  // Filter patients based on role
  const getFilteredPatients = () => {
    let filtered = patients

    // Role-based filtering
    if (role === "doctor") {
      filtered = patients.filter((p) => p.assignedDoctor === "Dr. Sarah Johnson") // Mock current doctor
    } else if (role === "nurse") {
      filtered = patients // In real app, filter by assigned nurse
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.phone.includes(searchTerm),
      )
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter)
    }

    return filtered
  }

  const filteredPatients = getFilteredPatients()

  const handleAddPatient = (newPatient: Partial<Patient>) => {
    const patient: Patient = {
      id: (patients.length + 1).toString(),
      name: newPatient.name || "",
      age: newPatient.age || 0,
      gender: (newPatient.gender as "male" | "female" | "other") || "male",
      phone: newPatient.phone || "",
      email: newPatient.email,
      address: newPatient.address || "",
      diagnosis: newPatient.diagnosis || "",
      assignedDoctor: newPatient.assignedDoctor || "",
      assignedBed: newPatient.assignedBed,
      vitals: {
        bloodPressure: "120/80",
        heartRate: 72,
        temperature: 98.6,
        oxygenSaturation: 98,
      },
      history: [],
      admissionDate: new Date(),
      status: "admitted",
      nursingNotes: [],
    }
    setPatients([...patients, patient])
    setShowAddPatient(false)
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {role === "doctor" ? "My Patients" : role === "nurse" ? "Assigned Patients" : "Patient Management"}
            </h1>
            <p className="text-gray-600">
              {role === "doctor"
                ? "Patients under your care"
                : role === "nurse"
                  ? "Patients assigned to you"
                  : "Manage hospital patients"}
            </p>
          </div>
          {(role === "receptionist" || role === "doctor") && (
            <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                  <DialogDescription>Enter patient information for registration</DialogDescription>
                </DialogHeader>
                <AddPatientForm onSubmit={handleAddPatient} onCancel={() => setShowAddPatient(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search patients by name, diagnosis, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  <SelectItem value="admitted">Admitted</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Patient Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold">{filteredPatients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Admitted</p>
                  <p className="text-2xl font-bold">{filteredPatients.filter((p) => p.status === "admitted").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Activity className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-2xl font-bold">{filteredPatients.filter((p) => p.status === "critical").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Activity className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Discharged</p>
                  <p className="text-2xl font-bold">
                    {filteredPatients.filter((p) => p.status === "discharged").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient List */}
        <div className="grid gap-6">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold">{patient.name}</h3>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="mr-2 h-4 w-4" />
                          Age: {patient.age} • {patient.gender}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="mr-2 h-4 w-4" />
                          {patient.phone}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="mr-2 h-4 w-4" />
                          Bed: {patient.assignedBed || "Not assigned"}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900">Diagnosis</p>
                        <p className="text-sm text-gray-600">{patient.diagnosis}</p>
                        <p className="text-sm text-gray-600">Dr. {patient.assignedDoctor}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900">Vitals</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>BP: {patient.vitals.bloodPressure}</div>
                          <div>HR: {patient.vitals.heartRate} bpm</div>
                          <div>Temp: {patient.vitals.temperature}°F</div>
                          <div>O2: {patient.vitals.oxygenSaturation}%</div>
                        </div>
                      </div>
                    </div>

                    {patient.history.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-900 mb-1">Medical History</p>
                        <div className="space-y-1">
                          {patient.history.slice(0, 2).map((item, index) => (
                            <p key={index} className="text-sm text-gray-600">
                              • {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <PatientDetailsModal patient={patient} role={role} />
                      </DialogContent>
                    </Dialog>

                    {(role === "doctor" || role === "nurse") && (
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Add Note
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

function AddPatientForm({
  onSubmit,
  onCancel,
}: { onSubmit: (patient: Partial<Patient>) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    diagnosis: "",
    assignedDoctor: "",
    assignedBed: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      age: Number.parseInt(formData.age) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age">Age *</Label>
          <Input
            id="age"
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Gender *</Label>
          <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
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
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedDoctor">Assigned Doctor</Label>
          <Input
            id="assignedDoctor"
            value={formData.assignedDoctor}
            onChange={(e) => setFormData({ ...formData, assignedDoctor: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="diagnosis">Initial Diagnosis</Label>
        <Textarea
          id="diagnosis"
          value={formData.diagnosis}
          onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Patient</Button>
      </div>
    </form>
  )
}

function PatientDetailsModal({ patient, role }: { patient: Patient; role: string }) {
  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          {patient.name}
          <Badge
            variant={
              patient.status === "critical" ? "destructive" : patient.status === "admitted" ? "default" : "secondary"
            }
          >
            {patient.status}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Patient ID: {patient.id} • Admitted: {patient.admissionDate.toLocaleDateString()}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Age & Gender</p>
              <p>
                {patient.age} years old • {patient.gender}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Phone</p>
              <p>{patient.phone}</p>
            </div>
            {patient.email && (
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p>{patient.email}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-600">Address</p>
              <p>{patient.address}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Diagnosis</p>
              <p>{patient.diagnosis}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Assigned Doctor</p>
              <p>{patient.assignedDoctor}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Bed Assignment</p>
              <p>{patient.assignedBed || "Not assigned"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Vitals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Blood Pressure</p>
              <p className="text-lg font-bold">{patient.vitals.bloodPressure}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-600">Heart Rate</p>
              <p className="text-lg font-bold">{patient.vitals.heartRate} bpm</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-orange-600">Temperature</p>
              <p className="text-lg font-bold">{patient.vitals.temperature}°F</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-600">O2 Saturation</p>
              <p className="text-lg font-bold">{patient.vitals.oxygenSaturation}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {patient.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {patient.history.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {patient.nursingNotes && patient.nursingNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nursing Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {patient.nursingNotes.map((note, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">{note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
