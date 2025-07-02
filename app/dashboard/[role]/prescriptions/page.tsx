"use client"

import type React from "react"

import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
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
import { FileText, Plus, Search, CheckCircle, X, Clock, User, Calendar, Pill } from "lucide-react"
import { mockPrescriptions, mockPatients, type Prescription } from "@/lib/mock-data"

export default function PrescriptionsPage({ params }: { params: { role: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = params
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(mockPrescriptions)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAddPrescription, setShowAddPrescription] = useState(false)

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

  const getFilteredPrescriptions = () => {
    let filtered = prescriptions

    // Role-based filtering
    if (role === "doctor") {
      filtered = prescriptions.filter((p) => p.doctorName === "Dr. Sarah Johnson")
    } else if (role === "pharmacist") {
      // Pharmacists see all prescriptions
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.medicines.some((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter)
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const filteredPrescriptions = getFilteredPrescriptions()

  const handleAddPrescription = (newPrescription: Partial<Prescription>) => {
    const prescription: Prescription = {
      id: (prescriptions.length + 1).toString(),
      patientId: newPrescription.patientId || "",
      patientName: newPrescription.patientName || "",
      doctorId: "doc1",
      doctorName: "Dr. Sarah Johnson",
      medicines: newPrescription.medicines || [],
      status: "pending",
      notes: newPrescription.notes,
      createdAt: new Date(),
    }
    setPrescriptions([...prescriptions, prescription])
    setShowAddPrescription(false)
  }

  const handleStatusChange = (
    prescriptionId: string,
    newStatus: "pending" | "approved" | "rejected",
    notes?: string,
  ) => {
    setPrescriptions(
      prescriptions.map((p) =>
        p.id === prescriptionId
          ? {
              ...p,
              status: newStatus,
              processedAt: new Date(),
              processedBy: "Current User",
              notes: notes || p.notes,
            }
          : p,
      ),
    )
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {role === "doctor" ? "My Prescriptions" : "Prescription Management"}
            </h1>
            <p className="text-gray-600">
              {role === "doctor" ? "Prescriptions you've created" : "Review and approve prescriptions"}
            </p>
          </div>
          {role === "doctor" && (
            <Dialog open={showAddPrescription} onOpenChange={setShowAddPrescription}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Prescription
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Create New Prescription</DialogTitle>
                  <DialogDescription>Add medicines and instructions for a patient</DialogDescription>
                </DialogHeader>
                <AddPrescriptionForm onSubmit={handleAddPrescription} onCancel={() => setShowAddPrescription(false)} />
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
                    placeholder="Search prescriptions by patient, doctor, or medicine..."
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Prescription Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{filteredPrescriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">
                    {filteredPrescriptions.filter((p) => p.status === "pending").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold">
                    {filteredPrescriptions.filter((p) => p.status === "approved").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold">
                    {filteredPrescriptions.filter((p) => p.status === "rejected").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prescriptions List */}
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <Card key={prescription.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{prescription.patientName}</h3>
                      <Badge
                        variant={
                          prescription.status === "pending"
                            ? "secondary"
                            : prescription.status === "approved"
                              ? "default"
                              : "destructive"
                        }
                      >
                        {prescription.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="mr-2 h-4 w-4" />
                        {prescription.doctorName}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="mr-2 h-4 w-4" />
                        {prescription.createdAt.toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Pill className="mr-2 h-4 w-4" />
                        {prescription.medicines.length} medicine(s)
                      </div>
                    </div>

                    {/* Medicines */}
                    <div className="space-y-2 mb-4">
                      <h4 className="font-medium text-sm">Medicines:</h4>
                      {prescription.medicines.map((medicine, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="font-medium">{medicine.name}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Dosage: {medicine.dosage}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Frequency: {medicine.frequency}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Duration: {medicine.duration}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {prescription.notes && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-1">Notes:</h4>
                        <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">{prescription.notes}</p>
                      </div>
                    )}

                    {prescription.processedAt && (
                      <div className="text-sm text-gray-500">
                        Processed by {prescription.processedBy} on {prescription.processedAt.toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {role === "pharmacist" && prescription.status === "pending" && (
                    <div className="flex flex-col gap-2 ml-4">
                      <Button onClick={() => handleStatusChange(prescription.id, "approved")} className="flex-1">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(prescription.id, "rejected", "Stock unavailable")}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPrescriptions.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No prescriptions found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

function AddPrescriptionForm({
  onSubmit,
  onCancel,
}: { onSubmit: (prescription: Partial<Prescription>) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    patientName: "",
    notes: "",
    medicines: [{ name: "", dosage: "", frequency: "", duration: "" }],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const addMedicine = () => {
    setFormData({
      ...formData,
      medicines: [...formData.medicines, { name: "", dosage: "", frequency: "", duration: "" }],
    })
  }

  const removeMedicine = (index: number) => {
    setFormData({
      ...formData,
      medicines: formData.medicines.filter((_, i) => i !== index),
    })
  }

  const updateMedicine = (index: number, field: string, value: string) => {
    const updatedMedicines = formData.medicines.map((medicine, i) =>
      i === index ? { ...medicine, [field]: value } : medicine,
    )
    setFormData({ ...formData, medicines: updatedMedicines })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="patientName">Patient *</Label>
        <Select
          value={formData.patientName}
          onValueChange={(value) => setFormData({ ...formData, patientName: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select patient" />
          </SelectTrigger>
          <SelectContent>
            {mockPatients.map((patient) => (
              <SelectItem key={patient.id} value={patient.name}>
                {patient.name} - {patient.diagnosis}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Medicines</h3>
          <Button type="button" onClick={addMedicine} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Medicine
          </Button>
        </div>

        {formData.medicines.map((medicine, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Medicine Name *</Label>
                  <Input
                    value={medicine.name}
                    onChange={(e) => updateMedicine(index, "name", e.target.value)}
                    placeholder="Enter medicine name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dosage *</Label>
                  <Input
                    value={medicine.dosage}
                    onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select
                    value={medicine.frequency}
                    onValueChange={(value) => updateMedicine(index, "frequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Once daily">Once daily</SelectItem>
                      <SelectItem value="Twice daily">Twice daily</SelectItem>
                      <SelectItem value="Three times daily">Three times daily</SelectItem>
                      <SelectItem value="Four times daily">Four times daily</SelectItem>
                      <SelectItem value="As needed">As needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <Input
                    value={medicine.duration}
                    onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                    placeholder="e.g., 7 days"
                    required
                  />
                </div>
              </div>
              {formData.medicines.length > 1 && (
                <div className="mt-4 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => removeMedicine(index)}>
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Special instructions, warnings, or additional information..."
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Prescription</Button>
      </div>
    </form>
  )
}
