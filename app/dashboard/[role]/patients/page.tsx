"use client"

import * as React from "react"

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
import { collection, getDocs, setDoc, doc, updateDoc, deleteField } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, Staff } from "@/lib/types"
import { askGeminiServer } from "@/lib/gemini"

export default function PatientsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [editPatientData, setEditPatientData] = useState<Patient | null>(null)
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false)
  const [dischargePatientId, setDischargePatientId] = useState<string | null>(null)
  const [showAddNote, setShowAddNote] = useState(false)
  const [notePatient, setNotePatient] = useState<Patient | null>(null)
  const [noteContent, setNoteContent] = useState("")
  const [deletingHistoryIndex, setDeletingHistoryIndex] = useState<number | null>(null)
  const [doctors, setDoctors] = useState<Staff[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db) {
      getDocs(collection(db, "patients")).then(snapshot => {
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))
      })
      getDocs(collection(db, "users")).then(snapshot => {
        setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)).filter(u => u.role === "doctor"))
      })
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
      const doctorName = user?.displayName || user?.name ;
      filtered = patients.filter((p) => p.assignedDoctor === doctorName)
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

  const handleAddPatient = async (newPatient: Partial<Patient>) => {
    if (!db) return
    const patient: Patient = {
      id: String(Date.now()),
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
      bills: [{
        id: `consult-${Date.now()}`,
        date: new Date().toISOString(),
        items: [{ name: "Doctor Consultation", quantity: 1, price: 500 }],
        total: 500,
        status: "unpaid"
      }],
    }
    await setDoc(doc(db, "patients", patient.id), patient)
    setPatients([...patients, patient])
    setShowAddPatient(false)
  }

  const handleEditPatient = async (updated: Patient) => {
    if (!db) return
    await setDoc(doc(db, "patients", updated.id), updated, { merge: true })
    setPatients(patients.map((p) => (p.id === updated.id ? updated : p)))
    setShowEditPatient(false)
    setEditPatientData(null)
  }

  const handleDischargePatient = async (id: string) => {
    if (!db) return
    await setDoc(doc(db, "patients", id), { status: "discharged", assignedBed: deleteField() }, { merge: true })
    setPatients(patients.map((p) => (p.id === id ? { ...p, status: "discharged", assignedBed: undefined } : p)))
    setShowDischargeConfirm(false)
    setDischargePatientId(null)
  }

  const handleAddNote = async () => {
    if (!db || !notePatient) return
    const updatedHistory = [...(notePatient.history || []), noteContent]
    await setDoc(doc(db, "patients", notePatient.id), { history: updatedHistory }, { merge: true })
    setPatients(patients.map((p) => (p.id === notePatient.id ? { ...p, history: updatedHistory } : p)))
    setShowAddNote(false)
    setNotePatient(null)
    setNoteContent("")
  }

  async function handleGenerateSummary() {
    setLoadingSummary(true);
    setSummary(null);
    try {
      if (!selectedPatient) {
        setSummary("No patient selected. Please select a patient first.");
        return;
      }
      
      const prompt = `Generate a comprehensive health summary for the following patient. Provide clear, professional insights for both doctors and nurses in plain text format without any markdown formatting.

PATIENT INFORMATION:
Name: ${selectedPatient.name || 'Unknown'}
Age: ${selectedPatient.age || 'Unknown'}
Gender: ${selectedPatient.gender || 'Unknown'}
Diagnosis: ${selectedPatient.diagnosis || 'No diagnosis recorded'}
Status: ${selectedPatient.status || 'Unknown'}
Assigned Doctor: ${selectedPatient.assignedDoctor || 'Not assigned'}

CURRENT VITALS:
Blood Pressure: ${selectedPatient.vitals?.bloodPressure || 'Not recorded'}
Heart Rate: ${selectedPatient.vitals?.heartRate || 'Not recorded'} bpm
Temperature: ${selectedPatient.vitals?.temperature || 'Not recorded'}°F
Oxygen Saturation: ${selectedPatient.vitals?.oxygenSaturation || 'Not recorded'}%

MEDICAL HISTORY:
${selectedPatient.history?.length > 0 ? selectedPatient.history.join('\n') : 'No recorded history'}

Please provide a comprehensive summary in plain text format (NO asterisks, NO markdown) organized as follows:

PATIENT OVERVIEW:
Brief summary of current condition and status

FOR DOCTORS:
- Clinical assessment and differential diagnosis considerations
- Medication recommendations and dosage adjustments
- Treatment plan modifications
- Specialist referral needs
- Diagnostic test requirements

FOR NURSES:
- Monitoring priorities and frequency
- Vital signs watch points
- Patient safety considerations
- Care interventions and comfort measures
- Patient education topics
- Family communication points

IMMEDIATE PRIORITIES:
Key actions needed in next 24 hours

RISK ASSESSMENT:
Potential complications to monitor

Use clear, professional language without any special formatting characters.`;
      
      const result = await askGeminiServer(prompt);
      // Clean up any remaining markdown formatting
      const cleanedResult = result
        .replace(/\*\*/g, '') // Remove bold asterisks
        .replace(/\*/g, '') // Remove italic asterisks
        .replace(/#{1,6}\s/g, '') // Remove header hashtags
        .replace(/`/g, '') // Remove code backticks
        .trim();
      
      setSummary(cleanedResult || "No summary generated. Please try again.");
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary("Failed to generate summary. Please check your connection and try again.");
    } finally {
      setLoadingSummary(false);
    }
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
                <AddPatientForm onSubmit={handleAddPatient} onCancel={() => setShowAddPatient(false)} doctors={doctors} />
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
                          <div>BP: {patient.vitals?.bloodPressure ?? "N/A"}</div>
                          <div>HR: {patient.vitals?.heartRate ?? "N/A"} bpm</div>
                          <div>Temp: {patient.vitals?.temperature ?? "N/A"}°F</div>
                          <div>O2: {patient.vitals?.oxygenSaturation ?? "N/A"}%</div>
                        </div>
                      </div>
                    </div>

                    {(patient.history?.length ?? 0) > 0 && (
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
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPatient(patient); setShowAddNote(true); }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <PatientDetailsModal patient={patient} role={role} onUpdateHistory={async (updatedHistory) => {
                          if (!db) return;
                          await setDoc(doc(db, "patients", patient.id), { history: updatedHistory }, { merge: true });
                          setPatients(patients.map((p) => (p.id === patient.id ? { ...p, history: updatedHistory } : p)));
                        }} />
                      </DialogContent>
                    </Dialog>

                    {role === "doctor" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => { setEditPatientData(patient); setShowEditPatient(true); }}>
                          Edit
                        </Button>
                        {patient.status !== "discharged" && (
                          <Button variant="outline" size="sm" onClick={() => { setDischargePatientId(patient.id); setShowDischargeConfirm(true); }}>
                            Discharge
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => { setNotePatient(patient); setShowAddNote(true); }}>
                          Add Note
                        </Button>
                      </>
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

        {showEditPatient && editPatientData && (
          <Dialog open={showEditPatient} onOpenChange={setShowEditPatient}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Patient</DialogTitle>
              </DialogHeader>
              <AddPatientForm
                onSubmit={(data) => handleEditPatient({ ...editPatientData, ...data })}
                onCancel={() => setShowEditPatient(false)}
                initialData={editPatientData}
                doctors={doctors}
              />
            </DialogContent>
          </Dialog>
        )}

        {showDischargeConfirm && dischargePatientId && (
          <Dialog open={showDischargeConfirm} onOpenChange={setShowDischargeConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Discharge Patient</DialogTitle>
                <DialogDescription>Are you sure you want to discharge this patient?</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDischargeConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDischargePatient(dischargePatientId)}>Discharge</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showAddNote && notePatient && (
          <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Note for {notePatient.name}</DialogTitle>
              </DialogHeader>
              <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Enter note..." />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
                <Button onClick={handleAddNote} disabled={!noteContent.trim()}>Add Note</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}

function AddPatientForm({
  onSubmit,
  onCancel,
  initialData,
  doctors = [],
}: { onSubmit: (patient: Partial<Patient>) => void; onCancel: () => void; initialData?: Patient; doctors?: Staff[] }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    age: initialData?.age?.toString() || "",
    gender: initialData?.gender || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    address: initialData?.address || "",
    diagnosis: initialData?.diagnosis || "",
    assignedDoctor: initialData?.assignedDoctor || "",
    assignedBed: initialData?.assignedBed || "",
    bloodPressure: initialData?.vitals?.bloodPressure || "",
    heartRate: initialData?.vitals?.heartRate?.toString() || "",
    temperature: initialData?.vitals?.temperature?.toString() || "",
    oxygenSaturation: initialData?.vitals?.oxygenSaturation?.toString() || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      age: Number.parseInt(formData.age) || 0,
      gender: formData.gender as "male" | "female" | "other",
      vitals: {
        bloodPressure: formData.bloodPressure || "",
        heartRate: formData.heartRate ? Number(formData.heartRate) : 0,
        temperature: formData.temperature ? Number(formData.temperature) : 0,
        oxygenSaturation: formData.oxygenSaturation ? Number(formData.oxygenSaturation) : 0,
      },
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
          <Select value={formData.assignedDoctor} onValueChange={value => setFormData({ ...formData, assignedDoctor: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors && doctors.length > 0 ? (
                doctors.map(doc => (
                  <SelectItem key={doc.id} value={doc.name}>{doc.name} ({doc.specialization || "Doctor"})</SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>No doctors available</SelectItem>
              )}
            </SelectContent>
          </Select>
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
      {user?.role === "doctor" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Initial Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bloodPressure">Blood Pressure</Label>
            <Input
              id="bloodPressure"
              value={formData.bloodPressure}
              onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
              placeholder="e.g., 120/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heartRate">Heart Rate</Label>
            <Input
              id="heartRate"
              type="number"
              value={formData.heartRate}
              onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
              placeholder="e.g., 72"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature (°F)</Label>
            <Input
              id="temperature"
              type="number"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              placeholder="e.g., 98.6"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oxygenSaturation">O2 Saturation (%)</Label>
            <Input
              id="oxygenSaturation"
              type="number"
              value={formData.oxygenSaturation}
              onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
              placeholder="e.g., 98"
            />
          </div>
        </>
      )}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Patient</Button>
      </div>
    </form>
  )
}

function PatientDetailsModal({ patient, role, onUpdateHistory }: { patient: Patient; role: string; onUpdateHistory?: (updatedHistory: string[]) => void }) {
  const [editingHistoryIndex, setEditingHistoryIndex] = useState<number | null>(null);
  const [editingHistoryValue, setEditingHistoryValue] = useState("");
  const [showAddBill, setShowAddBill] = useState(false);
  const [billService, setBillService] = useState("");
  const [billQuantity, setBillQuantity] = useState(1);
  const [billPrice, setBillPrice] = useState(0);
  const [editBillIdx, setEditBillIdx] = useState<number | null>(null);
  const [editBillService, setEditBillService] = useState("");
  const [editBillQuantity, setEditBillQuantity] = useState(1);
  const [editBillPrice, setEditBillPrice] = useState(0);
  const [showDeleteBillIdx, setShowDeleteBillIdx] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleEditHistory = async (index: number, newValue: string) => {
    if (!onUpdateHistory) return;
    const updatedHistory = [...(patient.history || [])];
    updatedHistory[index] = newValue;
    await onUpdateHistory(updatedHistory);
    setEditingHistoryIndex(null);
    setEditingHistoryValue("");
  };
  const handleDeleteHistory = async (index: number) => {
    if (!onUpdateHistory) return;
    const updatedHistory = [...(patient.history || [])];
    updatedHistory.splice(index, 1);
    await onUpdateHistory(updatedHistory);
    setEditingHistoryIndex(null);
    setEditingHistoryValue("");
  };

  async function handleGenerateSummary() {
    setLoadingSummary(true);
    setSummary(null);
    try {
      const prompt = `Generate a comprehensive health summary for the following patient. Provide clear, professional insights for both doctors and nurses in plain text format without any markdown formatting.

PATIENT INFORMATION:
Name: ${patient.name || 'Unknown'}
Age: ${patient.age || 'Unknown'}
Gender: ${patient.gender || 'Unknown'}
Diagnosis: ${patient.diagnosis || 'No diagnosis recorded'}
Status: ${patient.status || 'Unknown'}
Assigned Doctor: ${patient.assignedDoctor || 'Not assigned'}

CURRENT VITALS:
Blood Pressure: ${patient.vitals?.bloodPressure || 'Not recorded'}
Heart Rate: ${patient.vitals?.heartRate || 'Not recorded'} bpm
Temperature: ${patient.vitals?.temperature || 'Not recorded'}°F
Oxygen Saturation: ${patient.vitals?.oxygenSaturation || 'Not recorded'}%

MEDICAL HISTORY:
${patient.history?.length > 0 ? patient.history.join('\n') : 'No recorded history'}

Please provide a comprehensive summary in plain text format (NO asterisks, NO markdown) organized as follows:

PATIENT OVERVIEW:
Brief summary of current condition and status

FOR DOCTORS:
- Clinical assessment and differential diagnosis considerations
- Medication recommendations and dosage adjustments
- Treatment plan modifications
- Specialist referral needs
- Diagnostic test requirements

FOR NURSES:
- Monitoring priorities and frequency
- Vital signs watch points
- Patient safety considerations
- Care interventions and comfort measures
- Patient education topics
- Family communication points

IMMEDIATE PRIORITIES:
Key actions needed in next 24 hours

RISK ASSESSMENT:
Potential complications to monitor

Use clear, professional language without any special formatting characters.`;
      
      const result = await askGeminiServer(prompt);
      // Clean up any remaining markdown formatting
      const cleanedResult = result
        .replace(/\*\*/g, '') // Remove bold asterisks
        .replace(/\*/g, '') // Remove italic asterisks
        .replace(/#{1,6}\s/g, '') // Remove header hashtags
        .replace(/`/g, '') // Remove code backticks
        .trim();
      
      setSummary(cleanedResult || "No summary generated. Please try again.");
    } catch (e) {
      console.error('Error generating summary:', e);
      setSummary("Failed to generate summary. Please check your connection and try again.");
    }
    setLoadingSummary(false);
  }

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
          Patient ID: {patient.id} • Admitted: {patient.admissionDate ? patient.admissionDate.toLocaleDateString() : "N/A"}
        </DialogDescription>
      </DialogHeader>

      {/* Gemini Health Summary Button & Display */}
      <div>
        <Button onClick={handleGenerateSummary} disabled={loadingSummary} className="mb-2">
          {loadingSummary ? "Generating..." : "Generate Health Summary (AI)"}
        </Button>
        {summary && (
          <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded text-gray-900 whitespace-pre-line">
            {summary}
          </div>
        )}
      </div>

      {role === "receptionist" && (
        <>
          <Button onClick={() => setShowAddBill(true)} className="mb-2">Add Manual Bill</Button>
          <Dialog open={showAddBill} onOpenChange={setShowAddBill}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Bill</DialogTitle>
                <DialogDescription>Enter details for the new billable service.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input value={billService} onChange={e => setBillService(e.target.value)} placeholder="e.g. Lab Test" />
                <Label>Quantity</Label>
                <Input type="number" value={billQuantity} min={1} onChange={e => setBillQuantity(Number(e.target.value))} />
                <Label>Price (₹)</Label>
                <Input type="number" value={billPrice} min={0} onChange={e => setBillPrice(Number(e.target.value))} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowAddBill(false)}>Cancel</Button>
                <Button onClick={async () => {
                  if (!db || !patient.id || !billService || billPrice <= 0) return;
                  const newBill = {
                    id: `manual-${Date.now()}`,
                    date: new Date().toISOString(),
                    items: [{ name: billService, quantity: billQuantity, price: billPrice }],
                    total: billQuantity * billPrice,
                    status: "unpaid"
                  };
                  const bills = Array.isArray(patient.bills) ? [...patient.bills, newBill] : [newBill];
                  await setDoc(doc(db, "patients", patient.id), { bills }, { merge: true });
                  setShowAddBill(false);
                  setBillService("");
                  setBillQuantity(1);
                  setBillPrice(0);
                  window.location.reload();
                }}>Add Bill</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

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
              <p className="text-lg font-bold">{patient.vitals?.bloodPressure ?? "N/A"}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-600">Heart Rate</p>
              <p className="text-lg font-bold">{patient.vitals?.heartRate ?? "N/A"} bpm</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-orange-600">Temperature</p>
              <p className="text-lg font-bold">{patient.vitals?.temperature ?? "N/A"}°F</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-600">O2 Saturation</p>
              <p className="text-lg font-bold">{patient.vitals?.oxygenSaturation ?? "N/A"}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {patient.history?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {patient.history.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mr-2">•</span>
                  {role === "doctor" && editingHistoryIndex === index ? (
                    <>
                      <Input
                        value={editingHistoryValue}
                        onChange={e => setEditingHistoryValue(e.target.value)}
                        className="w-auto flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleEditHistory(index, editingHistoryValue)} disabled={!editingHistoryValue.trim()}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingHistoryIndex(null); setEditingHistoryValue("") }}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span>{item}</span>
                      {role === "doctor" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingHistoryIndex(index); setEditingHistoryValue(item) }}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteHistory(index)}>Delete</Button>
                        </>
                      )}
                    </>
                  )}
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
                  <p className="text-sm">{typeof note === "string" ? note : note.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

     

      {/* --- Bills & Payments section for Receptionist --- */}
      {role === "receptionist" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bills & Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Outstanding Balance */}
            <div className="mb-4">
              <span className="font-semibold">Outstanding Balance: </span>
              <span className="text-red-600 font-bold">
                ₹{Array.isArray(patient.bills)
                  ? patient.bills?.filter((b: any) => b.status !== "paid").reduce((sum: number, b: any) => sum + (b.total || 0), 0)
                  : 0}
              </span>
            </div>
            {/* Bill List */}
            {Array.isArray(patient.bills) && patient.bills?.length > 0 ? (
              <div className="space-y-4">
                {patient.bills?.map((bill: any, idx: number) => (
                  <div key={bill.id || idx} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-semibold">Date: {bill.date ? new Date(bill.date).toLocaleDateString() : "N/A"}</div>
                      <div className="text-sm text-gray-600">Status: 
                        <span className={bill.status === "paid" ? "text-green-600" : "text-red-600"}> {bill.status || "unpaid"}</span>
                      </div>
                      <div className="text-sm text-gray-600">Total: <span className="font-bold">₹{bill.total || 0}</span></div>
                      <div className="text-xs text-gray-500">Bill ID: {bill.id}</div>
                      <div className="mt-2">
                        <span className="font-medium">Items:</span>
                        <ul className="list-disc ml-5">
                          {bill.items && bill.items.map((item: any, i: number) => (
                            <li key={i}>
                              {item.name} ({item.quantity || 1}) - ₹{item.price || 0}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* Mark as Paid logic */}
                      {bill.status !== "paid" && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!db || !patient.id) return;
                            // Update the bill status in Firestore
                            const updatedBills = patient.bills?.map((b: any, i: number) => i === idx ? { ...b, status: "paid" } : b) || [];
                            await setDoc(doc(db, "patients", patient.id), { bills: updatedBills }, { merge: true });
                            window.location.reload();
                          }}
                        >
                          Mark as Paid
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // --- Download/Print logic ---
                          const printWindow = window.open('', '', 'width=800,height=600');
                          if (printWindow) {
                            printWindow.document.write('<html><head><title>Bill</title></head><body>');
                            printWindow.document.write(`<h2>Bill ID: ${bill.id}</h2>`);
                            printWindow.document.write(`<p><strong>Date:</strong> ${bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A'}</p>`);
                            printWindow.document.write(`<p><strong>Status:</strong> ${bill.status}</p>`);
                            printWindow.document.write(`<p><strong>Total:</strong> ₹${bill.total || 0}</p>`);
                            printWindow.document.write('<h3>Items:</h3><ul>');
                            bill.items?.forEach((item: any) => {
                              printWindow!.document.write(`<li>${item.name} (${item.quantity || 1}) - ₹${item.price || 0}</li>`);
                            });
                            printWindow.document.write('</ul>');
                            printWindow.document.write('</body></html>');
                            printWindow.document.close();
                            printWindow.focus();
                            printWindow.print();
                          }
                        }}
                      >
                        Download/Print
                      </Button>
                      {bill.status !== "paid" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditBillIdx(idx);
                            setEditBillService(bill.items[0]?.name || "");
                            setEditBillQuantity(bill.items[0]?.quantity || 1);
                            setEditBillPrice(bill.items[0]?.price || 0);
                          }}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => setShowDeleteBillIdx(idx)}>Delete</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No bills found for this patient.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Bill Dialog */}
      <Dialog open={editBillIdx !== null} onOpenChange={open => { if (!open) setEditBillIdx(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            <DialogDescription>Update the bill details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Service Name</Label>
            <Input value={editBillService} onChange={e => setEditBillService(e.target.value)} />
            <Label>Quantity</Label>
            <Input type="number" value={editBillQuantity} min={1} onChange={e => setEditBillQuantity(Number(e.target.value))} />
            <Label>Price (₹)</Label>
            <Input type="number" value={editBillPrice} min={0} onChange={e => setEditBillPrice(Number(e.target.value))} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditBillIdx(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!db || !patient.id || !editBillService || editBillPrice <= 0 || editBillIdx === null) return;
              const bills = Array.isArray(patient.bills) ? [...patient.bills] : [];
              bills[editBillIdx] = {
                ...bills[editBillIdx],
                items: [{ name: editBillService, quantity: editBillQuantity, price: editBillPrice }],
                total: editBillQuantity * editBillPrice
              };
              await setDoc(doc(db, "patients", patient.id), { bills }, { merge: true });
              setEditBillIdx(null);
              window.location.reload();
            }}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Bill Confirmation Dialog */}
      <Dialog open={showDeleteBillIdx !== null} onOpenChange={open => { if (!open) setShowDeleteBillIdx(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bill</DialogTitle>
            <DialogDescription>Are you sure you want to delete this bill?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteBillIdx(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!db || !patient.id || showDeleteBillIdx === null) return;
              const bills = Array.isArray(patient.bills) ? patient.bills.filter((_, i) => i !== showDeleteBillIdx) : [];
              await setDoc(doc(db, "patients", patient.id), { bills }, { merge: true });
              setShowDeleteBillIdx(null);
              window.location.reload();
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
