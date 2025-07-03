"use client"

import * as React from "react"

import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
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
import { collection, getDocs, setDoc, doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Prescription, Patient, InventoryItem } from "@/lib/types"
import { Firestore } from "firebase/firestore"

// Utility to safely format a date value (handles Date, Firestore Timestamp, string, number)
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

export default function PrescriptionsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAddPrescription, setShowAddPrescription] = useState(false)
  const [rejectionNote, setRejectionNote] = useState("")
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approvePrescription, setApprovePrescription] = useState<Prescription | null>(null)
  const [dispenseQuantities, setDispenseQuantities] = useState<{ [medicineName: string]: number }>({})
  const [inventoryMap, setInventoryMap] = useState<{ [medicineName: string]: { id: string, quantity: number, minThreshold: number, unit: string, cost?: number } }>({})
  const approveDialogPrescriptionRef = useRef<Prescription | null>(null)
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([])
  const [fallbackInventorySelection, setFallbackInventorySelection] = useState<{ [medicineName: string]: string }>({})

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db) {
      getDocs(collection(db, "prescriptions")).then(snapshot => {
        setPrescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)))
      })
      getDocs(collection(db, "patients")).then(snapshot => {
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))
      })
      getDocs(collection(db, "inventory")).then(snapshot => {
        setAllInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)))
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

  const handleAddPrescription = async (newPrescription: Partial<Prescription>) => {
    // Early return if db or required data is missing
    if (!db || !newPrescription.patientName) {
      alert("Missing required information")
      return
    }

    // Find the patient document to get the correct patientId
    const patientSnapshot = await getDocs(collection(db, "patients"))
    const patientDoc = patientSnapshot.docs.find(
      doc => doc.data().name.toLowerCase() === newPrescription.patientName?.toLowerCase()
    )

    if (!patientDoc) {
      // Show an error if patient not found
      alert(`Patient "${newPrescription.patientName}" not found. Please check the name.`)
      return
    }

    const patientData = patientDoc.data()
    
    // Safely extract doctor information
    const doctorId = user && typeof user === 'object' && 'id' in user 
      ? String(user.id) 
      : "doc1"
    
    const doctorName = user && typeof user === 'object' && 'name' in user 
      ? String(user.name) 
      : "Dr. Sarah Johnson"

    const prescription: Prescription = {
      id: String(Date.now()),
      patientId: patientData.id, 
      patientName: newPrescription.patientName,
      doctorId,
      doctorName,
      medicines: newPrescription.medicines || [],
      status: "pending",
      notes: newPrescription.notes,
      createdAt: new Date(),
    }

    try {
      // Ensure db is defined before using
      if (db) {
    await setDoc(doc(db, "prescriptions", prescription.id), prescription)
    setPrescriptions([...prescriptions, prescription])
    setShowAddPrescription(false)
      }
    } catch (error) {
      console.error("Error adding prescription:", error)
      alert("Failed to create prescription. Please try again.")
    }
  }

  const handleStatusChange = async (
    prescriptionId: string,
    newStatus: "pending" | "approved" | "rejected",
    notes?: string,
  ) => {
    if (!db) return
    const prescription = prescriptions.find((p) => p.id === prescriptionId)
    if (!prescription) return

    // If approving, reduce inventory and generate bill
    if (newStatus === "approved") {
      // 1. Reduce inventory for each medicine
      for (const med of prescription.medicines) {
        // Find inventory item by name (case-insensitive)
        const invSnap = await getDocs(collection(db as Firestore, "inventory"))
        const invDoc = invSnap.docs.find(doc => doc.data().name.toLowerCase() === med.name.toLowerCase())
        if (invDoc) {
          const invData = invDoc.data()
          const newQty = (invData.quantity || 0) - 1 // Reduce by 1 per prescription (customize as needed)
          await setDoc(doc(db, "inventory", invDoc.id), {
            ...invData,
            quantity: newQty < 0 ? 0 : newQty,
            lastUpdated: new Date().toISOString(),
            status:
              newQty <= 0 ? "out-of-stock" : newQty <= (invData.minThreshold || 0) ? "low-stock" : "available",
          }, { merge: true })
        }
      }
      // 2. Generate bill and store in patient document
      const patientSnap = await getDocs(collection(db, "patients"))
      const patientDoc = patientSnap.docs.find(doc => doc.data().id === prescription.patientId)
      if (patientDoc) {
        // Calculate bill items with actual medicine costs
        const billItems = await Promise.all(prescription.medicines.map(async (med) => {
          // Find the exact inventory item for this medicine
          const invSnap = await getDocs(collection(db as Firestore, "inventory"))
          const invDoc = invSnap.docs.find(doc => 
            doc.data().name.toLowerCase() === med.name.toLowerCase()
          )
          
          // Get the quantity to dispense (from dialog or default to 1)
          const quantity = dispenseQuantities[med.name] || 1
          
          // Use the inventory item's cost, or default to 0
          const price = invDoc && typeof invDoc.data().cost === 'number' 
            ? invDoc.data().cost * quantity 
            : 0

          return {
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            quantity,
            price,
          }
        }))

        // Calculate total bill
        const total = billItems.reduce((sum, item) => sum + item.price, 0)
        
        const bill = {
          id: `bill-${prescription.id}`,
          prescriptionId: prescription.id,
          date: new Date().toISOString(),
          items: billItems,
          total,
          status: "unpaid",
        }

        // Add to bills array (merge)
        await updateDoc(doc(db, "patients", patientDoc.id), {
          bills: arrayUnion(bill)
        })
      }
    }

    // Update prescription status and notes
    const updatedPrescriptions = prescriptions.map((p) =>
      p.id === prescriptionId
        ? {
            ...p,
            status: newStatus,
            processedAt: new Date(),
            processedBy: "Current User",
            notes: notes || p.notes,
          }
        : p,
    )
    const updated = updatedPrescriptions.find((p) => p.id === prescriptionId)
    if (updated) {
      await setDoc(doc(db, "prescriptions", prescriptionId), updated)
    }
    setPrescriptions(updatedPrescriptions)
  }

  // Helper to open approval dialog and fetch inventory
  const openApproveDialog = async (prescription: Prescription) => {
    setApprovePrescription(prescription)
    setApproveDialogOpen(true)
    // Fetch inventory for all medicines in prescription
    if (db) {
      const invSnap = await getDocs(collection(db as Firestore, "inventory"))
      const map: { [medicineName: string]: { id: string, quantity: number, minThreshold: number, unit: string, cost?: number } } = {}
      prescription.medicines.forEach(med => {
        const invDoc = invSnap.docs.find(doc => doc.data().name.toLowerCase() === med.name.toLowerCase())
        if (invDoc) {
          const invData = invDoc.data()
          map[med.name] = {
            id: invDoc.id,
            quantity: invData.quantity || 0,
            minThreshold: invData.minThreshold || 0,
            unit: invData.unit || "",
          }
        }
      })
      setInventoryMap(map)
      // Default dispense quantity is 1 for each
      setDispenseQuantities(Object.fromEntries(prescription.medicines.map(med => [med.name, 1])))
    }
  }

  const handleApproveConfirm = async () => {
    if (!db || !approvePrescription) return
    // 1. Update inventory for each medicine
    for (const med of approvePrescription.medicines) {
      let inv = inventoryMap[med.name]
      if (!inv && fallbackInventorySelection[med.name]) {
        const fallbackInv = allInventory.find(i => i.id === fallbackInventorySelection[med.name])
        if (fallbackInv) {
          inv = {
            id: fallbackInv.id,
            quantity: fallbackInv.quantity,
            minThreshold: fallbackInv.minThreshold,
            unit: fallbackInv.unit,
            cost: fallbackInv.cost,
          }
        }
      }
      if (inv) {
        const dispenseQty = dispenseQuantities[med.name] || 1
        const newQty = inv.quantity - dispenseQty
        await setDoc(doc(db, "inventory", inv.id), {
          quantity: newQty < 0 ? 0 : newQty,
          lastUpdated: new Date().toISOString(),
          status:
            newQty <= 0 ? "out-of-stock" : newQty <= inv.minThreshold ? "low-stock" : "available",
        }, { merge: true })
      }
    }
    // 2. Generate bill and store in patient document (always add, even if bills doesn't exist)
    const patientSnap = await getDocs(collection(db, "patients"))
    const patientDoc = patientSnap.docs.find(doc => doc.data().id === approvePrescription.patientId)
    if (patientDoc) {
      const billItems = approvePrescription.medicines.map(med => {
        let inv = inventoryMap[med.name]
        if (!inv && fallbackInventorySelection[med.name]) {
          const fallbackInv = allInventory.find(i => i.id === fallbackInventorySelection[med.name])
          if (fallbackInv) {
            inv = fallbackInv
          }
        }
        const price = inv && typeof inv.cost === 'number' ? inv.cost : 0
        return {
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          price,
          quantity: dispenseQuantities[med.name] || 1,
        }
      })
      const total = billItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const bill = {
        id: `bill-${approvePrescription.id}`,
        prescriptionId: approvePrescription.id,
        date: new Date().toISOString(),
        items: billItems,
        total,
        status: "unpaid",
      }
      // Always add to bills array, even if it doesn't exist
      const patientRef = doc(db, "patients", patientDoc.id)
      const patientData = patientDoc.data()
      let billsArr = []
      if (Array.isArray(patientData.bills)) {
        billsArr = [...patientData.bills, bill]
      } else {
        billsArr = [bill]
      }
      await setDoc(patientRef, { bills: billsArr }, { merge: true })
    }
    // 3. Update prescription status
    const updatedPrescriptions = prescriptions.map((p) =>
      p.id === approvePrescription.id
        ? {
            ...p,
            status: "approved" as "approved",
            processedAt: new Date(),
            processedBy: "Current User",
          }
        : p,
    )
    await setDoc(doc(db, "prescriptions", approvePrescription.id), updatedPrescriptions.find(p => p.id === approvePrescription.id))
    setPrescriptions(updatedPrescriptions)
    setApproveDialogOpen(false)
    setApprovePrescription(null)
    setDispenseQuantities({})
    setInventoryMap({})
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
                <AddPrescriptionForm onSubmit={handleAddPrescription} onCancel={() => setShowAddPrescription(false)} patients={patients} />
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
                        {formatDate(prescription.createdAt)}
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
                        Processed by {prescription.processedBy} on {formatDate(prescription.processedAt)}
                      </div>
                    )}
                  </div>

                  {role === "pharmacist" && prescription.status === "pending" && (
                    <div className="flex flex-col gap-2 ml-4">
                      <Dialog open={approveDialogOpen && approvePrescription?.id === prescription.id} onOpenChange={open => { setApproveDialogOpen(open); if (!open) setApprovePrescription(null) }}>
                        <DialogTrigger asChild>
                          <Button onClick={() => openApproveDialog(prescription)} className="flex-1">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Approve Prescription</DialogTitle>
                            <DialogDescription>Review and dispense medicines. Adjust quantities as needed.</DialogDescription>
                          </DialogHeader>
                          {approvePrescription && approvePrescription.medicines.map((med, idx) => {
                            let inv = inventoryMap[med.name]
                            const isLow = inv && (inv.quantity <= inv.minThreshold)
                            const isOut = inv && (inv.quantity <= 0)
                            // If not found, allow selection
                            const notFound = !inv
                            let fallbackInv: InventoryItem | undefined = undefined
                            if (notFound && fallbackInventorySelection[med.name]) {
                              fallbackInv = allInventory.find(i => i.id === fallbackInventorySelection[med.name])
                              if (fallbackInv) {
                                inv = {
                                  id: fallbackInv.id,
                                  quantity: fallbackInv.quantity,
                                  minThreshold: fallbackInv.minThreshold,
                                  unit: fallbackInv.unit,
                                }
                              }
                            }
                            // Quantity in prescription (default 1, but can be extended)
                            const prescribedQty = 'quantity' in med && typeof (med as any).quantity === 'number' ? (med as any).quantity : 1
                            return (
                              <div key={med.name} className={`mb-6 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-6 transition-all duration-200 border-2 ${inv && inv.quantity <= 0 ? 'border-red-300 bg-gradient-to-r from-red-50 to-white' : inv && inv.quantity <= inv.minThreshold ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-white' : 'border-gray-100 bg-gradient-to-r from-blue-50 to-white'}`}>
                                <div className="flex flex-col items-center justify-center min-w-[56px]">
                                  <span className="text-4xl mr-2">💊</span>
                                  <span className="text-xs text-gray-400 mt-1">Medicine</span>
                                </div>
                                <div className="flex-1 w-full">
                                  <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <span className="font-bold text-xl text-gray-900 tracking-wide">{med.name}</span>
                                    {inv && inv.quantity <= 0 && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">Out of Stock</span>}
                                    {inv && inv.quantity > 0 && inv.quantity <= inv.minThreshold && <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Low Stock</span>}
                                    {notFound && <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded">Not in Inventory</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-6 text-base text-gray-700 mb-3">
                                    <span><b>Dosage:</b> {med.dosage}</span>
                                    <span><b>Frequency:</b> {med.frequency}</span>
                                    <span><b>Duration:</b> {med.duration}</span>
                                    <span><b>Prescribed:</b> {prescribedQty}</span>
                                  </div>
                                  {notFound ? (
                                    <div className="flex flex-col md:flex-row items-center gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
                                      <div className="flex flex-col gap-2 w-full md:w-1/2">
                                        <span className="text-sm font-medium text-gray-700">Select inventory item:</span>
                                        <select
                                          className="border rounded px-2 py-1 w-full"
                                          value={fallbackInventorySelection[med.name] || ""}
                                          onChange={e => setFallbackInventorySelection(sel => ({ ...sel, [med.name]: e.target.value }))}
                                        >
                                          <option value="">-- Select --</option>
                                          {allInventory.map(item => (
                                            <option key={item.id} value={item.id}>
                                              {item.name} (Quantity: {"quantity" in item && typeof item.quantity === "number" ? item.quantity : 0} {"unit" in item && typeof item.unit === "string" ? item.unit : ""})
                                            </option>
                                          ))}
                                        </select>
                                        {fallbackInv && (
                                          <span className="text-xs text-gray-500">Selected: {fallbackInv.name} ({fallbackInv.quantity} {fallbackInv.unit})</span>
                                        )}
                                      </div>
                                      {fallbackInv && (
                                        <div className="flex flex-col gap-2 w-full md:w-1/2">
                                          <span className="text-sm font-medium text-gray-700">Quantity to Dispense:</span>
                                          <input
                                            type="number"
                                            min={1}
                                            max={fallbackInv.quantity}
                                            value={dispenseQuantities[med.name] || 1}
                                            onChange={e => {
                                              const val = Math.max(1, Math.min(fallbackInv.quantity, Number(e.target.value)))
                                              setDispenseQuantities(q => ({ ...q, [med.name]: val }))
                                            }}
                                            className="border-2 border-blue-300 rounded px-3 py-1 w-24 text-lg font-semibold text-blue-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                          />
                                          <span className="text-xs text-gray-500">New Stock: <b>{Math.max(0, fallbackInv.quantity - (dispenseQuantities[med.name] || 1))} {fallbackInv.unit}</b></span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-6 text-base mt-2">
                                      <span className="bg-blue-50 px-3 py-1 rounded border border-blue-100">Current Stock: <b>{inv && "quantity" in inv ? inv.quantity : "N/A"} {inv && "unit" in inv ? inv.unit : ""}</b></span>
                                      <label className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded border border-gray-200 focus-within:ring-2 focus-within:ring-blue-200">
                                        <span className="font-medium">Quantity to Reduce:</span>
                                        <input
                                          type="number"
                                          min={1}
                                          max={inv && "quantity" in inv ? inv.quantity : 1}
                                          value={dispenseQuantities[med.name] || 1}
                                          onChange={e => {
                                            const val = Math.max(1, Math.min(inv && "quantity" in inv ? inv.quantity : 1, Number(e.target.value)))
                                            setDispenseQuantities(q => ({ ...q, [med.name]: val }))
                                          }}
                                          className="ml-1 border-2 border-blue-300 rounded px-3 py-1 w-20 text-lg font-semibold text-blue-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                        />
                                      </label>
                                      <span className="bg-green-50 px-3 py-1 rounded border border-green-100">New Stock: <b>{inv && "quantity" in inv ? Math.max(0, inv.quantity - (dispenseQuantities[med.name] || 1)) : "-"} {inv && "unit" in inv ? inv.unit : ""}</b></span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          <Button onClick={handleApproveConfirm} className="w-full mt-2">Confirm & Approve</Button>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1">
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Prescription</DialogTitle>
                            <DialogDescription>Enter a note for rejection</DialogDescription>
                          </DialogHeader>
                          <Textarea
                            placeholder="Enter rejection reason..."
                            value={rejectionNote}
                            onChange={e => setRejectionNote(e.target.value)}
                          />
                          <Button
                            variant="destructive"
                            onClick={() => {
                              handleStatusChange(prescription.id, "rejected", rejectionNote)
                              setRejectionNote("")
                            }}
                          >
                            Confirm Reject
                          </Button>
                        </DialogContent>
                      </Dialog>
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
  patients = [],
}: { onSubmit: (prescription: Partial<Prescription>) => void; onCancel: () => void; patients: Patient[] }) {
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
            {(patients ?? []).map((patient: Patient) => (
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
