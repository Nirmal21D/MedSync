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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Bed, Search, User, MapPin, Calendar, Settings, UserPlus, UserMinus, Wrench, ArrowRightLeft } from "lucide-react"
import { collection, getDocs, setDoc, doc, updateDoc, deleteField } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Bed as BedType, Patient } from "@/lib/types"

// Helper function to fetch patients from Firestore
async function fetchPatientsFromFirestore(): Promise<Patient[]> {
  if (!db) return []
  const snapshot = await getDocs(collection(db, "patients"))
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient))
}

// Helper function to fetch beds from Firestore
async function fetchBedsFromFirestore(): Promise<BedType[]> {
  if (!db) return []
  const snapshot = await getDocs(collection(db, "beds"))
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BedType))
}

export default function BedManagementPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const [beds, setBeds] = useState<BedType[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [wardFilter, setWardFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedBed, setSelectedBed] = useState<BedType | null>(null)
  const [showAssignPatient, setShowAssignPatient] = useState(false)
  const [showChangeBed, setShowChangeBed] = useState(false)
  const [selectedPatientForChange, setSelectedPatientForChange] = useState<Patient | null>(null)

  // Fetch beds and patients from Firestore
  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db) {
      getDocs(collection(db, "beds")).then(snapshot => {
        setBeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BedType)))
      })
      // Use the helper function to fetch patients
      fetchPatientsFromFirestore().then(setPatients)
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

  const getFilteredBeds = () => {
    let filtered = beds

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (bed) =>
          bed.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bed.ward.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bed.patientName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Ward filtering
    if (wardFilter !== "all") {
      filtered = filtered.filter((bed) => bed.ward === wardFilter)
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((bed) => bed.status === statusFilter)
    }

    // Type filtering
    if (typeFilter !== "all") {
      filtered = filtered.filter((bed) => bed.type === typeFilter)
    }

    return filtered.sort((a, b) => a.number.localeCompare(b.number))
  }

  const filteredBeds = getFilteredBeds()
  const wards = [...new Set(beds.map((bed) => bed.ward))]

  const handleAssignPatient = async (bedId: string, patientId: string, patientName: string) => {
    if (!db) return
    setBeds(
      beds.map((bed) => (bed.id === bedId ? { ...bed, status: "occupied" as const, patientId, patientName } : bed)),
    )
    await setDoc(doc(db, "beds", bedId), {
      ...beds.find((bed) => bed.id === bedId),
      status: "occupied",
      patientId,
      patientName,
    })
    // Update patient document to reflect assigned bed
    await setDoc(doc(db, "patients", patientId), {
      ...patients.find((p) => p.id === patientId),
      assignedBed: bedId,
    })
    setShowAssignPatient(false)
    setSelectedBed(null)
    // Refetch patients and beds after assignment to keep in sync
    fetchPatientsFromFirestore().then(setPatients)
    fetchBedsFromFirestore().then(setBeds)
  }

  const handleDischargePatient = async (bedId: string) => {
    if (!db) return
    const bed = beds.find((bed) => bed.id === bedId)
    setBeds(
      beds.map((bed) =>
        bed.id === bedId ? { ...bed, status: "available" as const, patientId: undefined, patientName: undefined } : bed,
      ),
    )
    await setDoc(doc(db, "beds", bedId), {
      ...bed,
      status: "available",
      patientId: deleteField(),
      patientName: deleteField(),
    }, { merge: true })
    // Remove assignedBed from patient if exists
    if (bed?.patientId) {
      await setDoc(doc(db, "patients", bed.patientId), {
        ...patients.find((p) => p.id === bed.patientId),
        assignedBed: deleteField(),
      }, { merge: true })
    }
    // Refetch patients and beds after discharge to keep in sync
    fetchPatientsFromFirestore().then(setPatients)
    fetchBedsFromFirestore().then(setBeds)
  }

  const handleMaintenanceToggle = async (bedId: string) => {
    if (!db) return
    setBeds(
      beds.map((bed) =>
        bed.id === bedId
          ? { ...bed, status: bed.status === "maintenance" ? "available" : ("maintenance" as const) }
          : bed,
      ),
    )
    const bed = beds.find((bed) => bed.id === bedId)
    if (bed) {
      await setDoc(doc(db, "beds", bedId), {
        ...bed,
        status: bed.status === "maintenance" ? "available" : "maintenance",
      })
    }
  }

  // New: Change Patient Bed
  const handleChangePatientBed = async (patient: Patient, newBedId: string) => {
    if (!db) return
    // Find the new bed and the old bed
    const newBed = beds.find((b) => b.id === newBedId)
    const oldBed = beds.find((b) => b.id === patient.assignedBed)
    if (!newBed) return

    // 1. Set old bed to available (if exists)
    if (oldBed) {
      await setDoc(doc(db, "beds", oldBed.id), {
        ...oldBed,
        status: "available",
        patientId: deleteField(),
        patientName: deleteField(),
      }, { merge: true })
    }

    // 2. Set new bed to occupied and assign patient
    await setDoc(doc(db, "beds", newBed.id), {
      ...newBed,
      status: "occupied",
      patientId: patient.id,
      patientName: patient.name,
    })

    // 3. Update patient assignedBed
    await setDoc(doc(db, "patients", patient.id), {
      ...patient,
      assignedBed: newBed.id,
    })

    // 4. Update local state
    fetchPatientsFromFirestore().then(setPatients)
    fetchBedsFromFirestore().then(setBeds)
    setShowChangeBed(false)
    setSelectedPatientForChange(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "default"
      case "occupied":
        return "secondary"
      case "maintenance":
        return "destructive"
      case "reserved":
        return "outline"
      default:
        return "default"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "icu":
        return "🏥"
      case "private":
        return "🛏️"
      case "emergency":
        return "🚨"
      default:
        return "🏨"
    }
  }

  // New: List of patients with assigned beds for "Change Bed" action
  const patientsWithBeds = patients.filter((p) => p.assignedBed)

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bed Management</h1>
            <p className="text-gray-600">Monitor and manage hospital bed allocation</p>
          </div>
          {/* New: Button to open Change Bed dialog */}
          <div>
            <Button
              variant="outline"
              onClick={() => setShowChangeBed(true)}
              className="flex items-center gap-2"
              disabled={patientsWithBeds.length === 0}
              title={patientsWithBeds.length === 0 ? "No patients assigned to beds" : "Change a patient's bed"}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Change Patient Bed
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search beds by number, ward, or patient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {wards.map((ward) => (
                    <SelectItem key={ward} value={ward}>
                      {ward}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="icu">ICU</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bed className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Beds</p>
                  <p className="text-2xl font-bold">{filteredBeds.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Bed className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available</p>
                  <p className="text-2xl font-bold">{filteredBeds.filter((b) => b.status === "available").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <User className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Occupied</p>
                  <p className="text-2xl font-bold">{filteredBeds.filter((b) => b.status === "occupied").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Maintenance</p>
                  <p className="text-2xl font-bold">{filteredBeds.filter((b) => b.status === "maintenance").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      (filteredBeds.filter((b) => b.status === "occupied").length / filteredBeds.length) * 100,
                    )}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBeds.map((bed) => (
            <Card
              key={bed.id}
              className={`hover:shadow-md transition-shadow ${
                bed.status === "available"
                  ? "border-green-200"
                  : bed.status === "occupied"
                    ? "border-orange-200"
                    : bed.status === "maintenance"
                      ? "border-red-200"
                      : "border-gray-200"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(bed.type)}</span>
                    <CardTitle className="text-lg">{bed.number}</CardTitle>
                    <Badge variant={getStatusColor(bed.status)} className="capitalize">
                      {bed.status}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {bed.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="mr-1 h-3 w-3" />
                    {bed.ward}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Settings className="mr-1 h-3 w-3" />
                    Floor {bed.floor}
                  </div>
                </div>

                {bed.patientName && (
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="font-medium text-sm">{bed.patientName}</p>
                    {bed.assignedNurse && <p className="text-xs text-gray-600">Nurse: {bed.assignedNurse}</p>}
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-600">Features:</p>
                  <div className="flex flex-wrap gap-1">
                    {bed.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {bed.lastCleaned && (
                  <p className="text-xs text-gray-500">Last cleaned: {new Date(bed.lastCleaned).toLocaleString()}</p>
                )}

                <div className="flex gap-2 pt-2">
                  {bed.status === "available" && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedBed(bed)
                        setShowAssignPatient(true)
                      }}
                    >
                      <UserPlus className="mr-1 h-3 w-3" />
                      Assign
                    </Button>
                  )}
                  {bed.status === "occupied" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => handleDischargePatient(bed.id)}
                      >
                        <UserMinus className="mr-1 h-3 w-3" />
                        Discharge
                      </Button>
                      {/* New: Change Bed button for this patient */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => {
                          // Find the patient assigned to this bed
                          const patient = patients.find((p) => p.id === bed.patientId)
                          if (patient) {
                            setSelectedPatientForChange(patient)
                            setShowChangeBed(true)
                          }
                        }}
                      >
                        <ArrowRightLeft className="mr-1 h-3 w-3" />
                        Change Bed
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleMaintenanceToggle(bed.id)}>
                    <Wrench className="mr-1 h-3 w-3" />
                    {bed.status === "maintenance" ? "Fix" : "Maintenance"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBeds.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Bed className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No beds found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assign Patient Dialog */}
        <Dialog open={showAssignPatient} onOpenChange={setShowAssignPatient}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Patient to Bed {selectedBed?.number}</DialogTitle>
              <DialogDescription>Select a patient to assign to this bed</DialogDescription>
            </DialogHeader>
            <AssignPatientForm
              bed={selectedBed}
              onSubmit={handleAssignPatient}
              onCancel={() => setShowAssignPatient(false)}
              fetchPatients={fetchPatientsFromFirestore}
              setPatients={setPatients}
              patients={patients}
            />
          </DialogContent>
        </Dialog>

        {/* Change Patient Bed Dialog */}
        <Dialog open={showChangeBed} onOpenChange={(open) => {
          setShowChangeBed(open)
          if (!open) setSelectedPatientForChange(null)
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Patient Bed</DialogTitle>
              <DialogDescription>
                Select a patient and a new bed to move them to.
              </DialogDescription>
            </DialogHeader>
            <ChangeBedForm
              patients={patients}
              beds={beds}
              selectedPatient={selectedPatientForChange}
              setSelectedPatient={setSelectedPatientForChange}
              onSubmit={handleChangePatientBed}
              onCancel={() => {
                setShowChangeBed(false)
                setSelectedPatientForChange(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

// AssignPatientForm now fetches patients from Firestore if needed
function AssignPatientForm({
  bed,
  onSubmit,
  onCancel,
  fetchPatients,
  setPatients,
  patients,
}: {
  bed: BedType | null
  onSubmit: (bedId: string, patientId: string, patientName: string) => void
  onCancel: () => void
  fetchPatients: () => Promise<Patient[]>
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>
  patients: Patient[]
}) {
  const [selectedPatient, setSelectedPatient] = useState("")
  const [loadingPatients, setLoadingPatients] = useState(false)

  // Optionally, allow manual refresh of patients
  const handleRefreshPatients = async () => {
    setLoadingPatients(true)
    const newPatients = await fetchPatients()
    setPatients(newPatients)
    setLoadingPatients(false)
  }

  const availablePatients = patients.filter((p: Patient) => !p.assignedBed)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (bed && selectedPatient) {
      const patient = availablePatients.find((p: Patient) => p.id === selectedPatient)
      if (patient) {
        onSubmit(bed.id, patient.id, patient.name)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="patient">Select Patient *</Label>
        <div className="flex gap-2 items-center">
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a patient" />
            </SelectTrigger>
            <SelectContent>
              {availablePatients.map((patient: Patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.name} - {patient.diagnosis}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleRefreshPatients}
            disabled={loadingPatients}
            title="Refresh patient list"
          >
            <svg
              className={`h-4 w-4 ${loadingPatients ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M4 4v5h.582M20 20v-5h-.581M5.5 19A9 9 0 1 1 19 5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedPatient}>
          Assign Patient
        </Button>
      </div>
    </form>
  )
}

// New: ChangeBedForm component
function ChangeBedForm({
  patients,
  beds,
  selectedPatient,
  setSelectedPatient,
  onSubmit,
  onCancel,
}: {
  patients: Patient[]
  beds: BedType[]
  selectedPatient: Patient | null
  setSelectedPatient: (p: Patient | null) => void
  onSubmit: (patient: Patient, newBedId: string) => void
  onCancel: () => void
}) {
  const [selectedBedId, setSelectedBedId] = useState<string>("")

  // Only patients with assigned beds
  const patientsWithBeds = patients.filter((p) => p.assignedBed)

  // Only available beds (not occupied, not maintenance)
  const availableBeds = beds.filter(
    (b) => b.status === "available" && (!selectedPatient || b.id !== selectedPatient.assignedBed)
  )

  // When patient changes, reset selectedBedId
  useEffect(() => {
    setSelectedBedId("")
  }, [selectedPatient])

  const handlePatientChange = (patientId: string) => {
    const patient = patientsWithBeds.find((p) => p.id === patientId) || null
    setSelectedPatient(patient)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPatient && selectedBedId) {
      onSubmit(selectedPatient, selectedBedId)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="change-patient">Select Patient *</Label>
        <Select
          value={selectedPatient?.id || ""}
          onValueChange={handlePatientChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a patient" />
          </SelectTrigger>
          <SelectContent>
            {patientsWithBeds.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.name} (Current Bed: {beds.find((b) => b.id === patient.assignedBed)?.number || "?"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="change-bed">Select New Bed *</Label>
        <Select
          value={selectedBedId}
          onValueChange={setSelectedBedId}
          disabled={!selectedPatient}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a new bed" />
          </SelectTrigger>
          <SelectContent>
            {availableBeds.map((bed: BedType) => (
              <SelectItem key={bed.id} value={bed.id}>
                {bed.number} - {bed.ward} ({bed.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableBeds.length === 0 && (
          <div className="text-xs text-muted-foreground px-2 py-1">No available beds</div>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedPatient || !selectedBedId}>
          Change Bed
        </Button>
      </div>
    </form>
  )
}
