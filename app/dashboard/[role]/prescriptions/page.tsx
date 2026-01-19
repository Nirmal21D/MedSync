"use client"

import * as React from "react"

import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Plus, Search, CheckCircle, X, Clock, User, Calendar, Pill, Camera, Activity, AlertCircle } from "lucide-react"
import { MedicineAutocomplete } from "@/components/prescriptions/medicine-autocomplete"
import { collection, getDocs, setDoc, doc, updateDoc, getDoc, arrayUnion, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Prescription, Patient, InventoryItem, Appointment } from "@/lib/types"
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
  
  // Patient scanner state
  const [uhidInput, setUhidInput] = useState("")
  const [scannedPatient, setScannedPatient] = useState<Patient | null>(null)
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([])
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db) {
      // Verify Firestore connection
      console.log("Firestore initialized:", !!db)
      console.log("Firestore app:", db.app?.name)
      

      // Real-time listener for prescriptions
      const unsubscribePrescriptions = onSnapshot(collection(db, "prescriptions"), (snapshot) => {
        const prescriptionsList = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(),
          } as Prescription
        })
        setPrescriptions(prescriptionsList)
        console.log("Loaded prescriptions:", prescriptionsList.length)
      }, (error) => {
        console.error("Error loading prescriptions:", error)
      })

      // Fetch patients (can remain one-time fetch or switch to real-time if needed)
      getDocs(collection(db, "patients")).then(snapshot => {
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))
      }).catch(error => {
        console.error("Error loading patients:", error)
      })
      
      getDocs(collection(db, "inventory")).then(snapshot => {
        setAllInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)))
      }).catch(error => {
        console.error("Error loading inventory:", error)
      })

      return () => unsubscribePrescriptions()
    } else {
      console.warn("Firestore database not initialized. Check Firebase configuration.")
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
      // Filter by doctor ID if current user is a doctor
      if (user) {
        // Handle various user object structures safely
        const userId = 'id' in user ? String(user.id) : 'uid' in user ? String(user.uid) : "";
        filtered = prescriptions.filter((p) => p.doctorId === userId)
      }
    } else if (role === "pharmacist" || role === "lab-staff") {
      // Pharmacists and lab staff see all prescriptions
      // No additional filtering needed
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

  const searchPatient = async () => {
    if (!uhidInput.trim()) return

    setSearching(true)
    try {
      if (!db) {
        // Demo mode
        setScannedPatient({
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
        
        setPatientPrescriptions([
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
        
        setPatientAppointments([
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
        setScannedPatient(patientData)

        // Fetch prescriptions
        const rxRef = collection(db, "prescriptions")
        const rxQuery = query(rxRef, where("patientId", "==", patientData.id))
        const rxSnapshot = await getDocs(rxQuery)
        setPatientPrescriptions(rxSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)))

        // Fetch appointments
        const aptRef = collection(db, "appointments")
        const aptQuery = query(aptRef, where("patientId", "==", patientData.id))
        const aptSnapshot = await getDocs(aptQuery)
        setPatientAppointments(aptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)))
      } else {
        setScannedPatient(null)
        setPatientPrescriptions([])
        setPatientAppointments([])
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
    alert("Barcode scanner would open here. For demo, please enter UHID manually.")
  }

  const handleAddPrescription = async (newPrescription: Partial<Prescription>) => {
    // Early return if db or required data is missing
    if (!db) {
      console.error("Firestore database not initialized")
      alert("Database connection error. Please refresh the page.")
      return
    }

    if (!newPrescription.patientName) {
      alert("Please select a patient")
      return
    }

    // Validate medicines array
    if (!newPrescription.medicines || newPrescription.medicines.length === 0) {
      alert("Please add at least one medicine")
      return
    }

    // Validate each medicine has required fields
    const invalidMedicines = newPrescription.medicines.filter(
      med => !med.name || !med.dosage || !med.frequency || !med.duration
    )
    if (invalidMedicines.length > 0) {
      alert("Please fill in all fields for each medicine (name, dosage, frequency, duration)")
      return
    }

    try {
      // Find the patient document to get the correct patientId
      const patientSnapshot = await getDocs(collection(db, "patients"))
      const patientDoc = patientSnapshot.docs.find(
        doc => doc.data().name.toLowerCase() === newPrescription.patientName?.toLowerCase()
      )

      if (!patientDoc) {
        alert(`Patient "${newPrescription.patientName}" not found. Please check the name.`)
        return
      }

      const patientData = patientDoc.data()
      
      // Safely extract doctor information
      const doctorId = user && typeof user === 'object' && 'id' in user 
        ? String(user.id) 
        : user && typeof user === 'object' && 'uid' in user
        ? String(user.uid)
        : "doc1"
      
      const doctorName = user && typeof user === 'object' && 'name' in user 
        ? String(user.name)
        : user && typeof user === 'object' && 'displayName' in user
        ? String(user.displayName)
        : "Dr. Unknown"

      // Create prescription object with proper data structure
      const prescription: Prescription = {
        id: `presc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
        patientId: patientDoc.id, // Use document ID, not data().id
        patientName: newPrescription.patientName,
        patientUhid: patientData.uhid || `UHID-${Date.now()}`,
        doctorId,
        doctorName,
        medicines: newPrescription.medicines,
        status: "pending",
        notes: newPrescription.notes || "",
        createdAt: new Date(),
      }

      console.log("Creating prescription:", prescription)
      console.log("Medicine names being persisted:", prescription.medicines.map(m => m.name))
      
      // Verify medicine names are not partial search strings
      const hasPartialNames = prescription.medicines.some(med => {
        const name = med.name.toLowerCase()
        // Check if name looks like a partial search (very short or common prefixes)
        return name.length < 5 || name === "para" || name === "amox" || name === "panto"
      })
      if (hasPartialNames) {
        console.warn("WARNING: Some medicine names appear to be partial search strings, not selected medicines!")
        console.warn("Medicine names:", prescription.medicines.map(m => m.name))
      }

      // Write to Firestore
      const prescriptionRef = doc(db, "prescriptions", prescription.id)
      await setDoc(prescriptionRef, {
        ...prescription,
        createdAt: prescription.createdAt, // Firestore will convert Date to Timestamp
      })

      console.log("Prescription written to Firestore successfully:", prescription.id)

      // Update local state
      // setPrescriptions([...prescriptions, prescription]) // No need to manually update, onSnapshot will handle it
      setShowAddPrescription(false)

      // Show success message
      alert("Prescription created successfully!")
    } catch (error) {
      console.error("Error adding prescription:", error)
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        prescription: newPrescription,
      })
      alert(`Failed to create prescription: ${error instanceof Error ? error.message : "Unknown error"}`)
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
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
              <DialogContent className="max-w-4xl glass-card bg-card backdrop-blur-xl shadow-lg">
                <DialogHeader>
                  <DialogTitle>Create New Prescription</DialogTitle>
                  <DialogDescription>Add medicines and instructions for a patient</DialogDescription>
                </DialogHeader>
                <AddPrescriptionForm onSubmit={handleAddPrescription} onCancel={() => setShowAddPrescription(false)} patients={patients} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Patient Scanner Section - For all roles */}
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scan Patient UHID
            </CardTitle>
            <CardDescription>
              Scan or enter patient UHID to view complete medical history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter UHID (e.g., UHID-202601-00001)"
                  value={uhidInput}
                  onChange={(e) => setUhidInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && searchPatient()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleScan} variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Scan
              </Button>
              <Button onClick={searchPatient} disabled={searching || !uhidInput.trim()}>
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>

            {scannedPatient && (
              <div className="mt-6 space-y-4">
                {/* Patient Header */}
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {scannedPatient.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{scannedPatient.name}</h3>
                        <p className="text-sm text-muted-foreground">UHID: {scannedPatient.uhid}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={scannedPatient.status === "stable" ? "default" : "destructive"}>
                          {scannedPatient.status}
                        </Badge>
                        <Badge variant="outline">{scannedPatient.age}Y/{scannedPatient.gender.charAt(0).toUpperCase()}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>📞 {scannedPatient.phone}</p>
                      <p>📧 {scannedPatient.email}</p>
                    </div>
                  </div>
                </div>

                {/* Vitals Cards */}
                {scannedPatient.vitals && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <Activity className="h-5 w-5 mx-auto mb-2 text-red-500" />
                          <p className="text-xs text-muted-foreground">Blood Pressure</p>
                          <p className="text-lg font-semibold">{scannedPatient.vitals.bloodPressure}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <Activity className="h-5 w-5 mx-auto mb-2 text-pink-500" />
                          <p className="text-xs text-muted-foreground">Heart Rate</p>
                          <p className="text-lg font-semibold">{scannedPatient.vitals.heartRate} bpm</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <Activity className="h-5 w-5 mx-auto mb-2 text-orange-500" />
                          <p className="text-xs text-muted-foreground">Temperature</p>
                          <p className="text-lg font-semibold">{scannedPatient.vitals.temperature}°F</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <Activity className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                          <p className="text-xs text-muted-foreground">O2 Saturation</p>
                          <p className="text-lg font-semibold">{scannedPatient.vitals.oxygenSaturation}%</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Patient Information Tabs */}
                <Tabs defaultValue="history" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="history">Medical History</TabsTrigger>
                    <TabsTrigger value="prescriptions">Prescriptions ({patientPrescriptions.length})</TabsTrigger>
                    <TabsTrigger value="appointments">Appointments ({patientAppointments.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="history" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Diagnosis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{scannedPatient.diagnosis || "No diagnosis recorded"}</p>
                      </CardContent>
                    </Card>

                    {scannedPatient.medicalHistory && scannedPatient.medicalHistory.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Past Medical History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {scannedPatient.medicalHistory.map((item, idx) => (
                            <div key={idx} className="border-l-2 border-primary pl-4">
                              <h4 className="font-semibold">{item.condition}</h4>
                              <p className="text-sm text-muted-foreground">
                                Diagnosed: {new Date(item.diagnosedDate).toLocaleDateString()}
                              </p>
                              {item.notes && <p className="text-sm mt-1">{item.notes}</p>}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ) : scannedPatient.history && scannedPatient.history.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Medical History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {scannedPatient.history.map((item, idx) => {
                              const displayText = typeof item === 'string' 
                                ? item 
                                : (item as any)?.name || JSON.stringify(item)
                              return (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{displayText}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </CardContent>
                      </Card>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>No medical history recorded</AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="prescriptions" className="space-y-4">
                    {patientPrescriptions.length > 0 ? (
                      patientPrescriptions.map((rx) => (
                        <Card key={rx.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">Dr. {rx.doctorName}</CardTitle>
                              <Badge variant={
                                rx.status === "approved" ? "default" :
                                rx.status === "pending" ? "secondary" : "destructive"
                              }>
                                {rx.status}
                              </Badge>
                            </div>
                            <CardDescription>
                              {new Date(rx.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {rx.medicines.map((med, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                  <Pill className="h-5 w-5 mt-0.5 text-primary" />
                                  <div className="flex-1">
                                    <p className="font-semibold">{med.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {med.dosage} • {med.frequency} • {med.duration}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {rx.notes && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-sm text-muted-foreground">
                                    <strong>Notes:</strong> {rx.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>No prescriptions found</AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="appointments" className="space-y-4">
                    {patientAppointments.length > 0 ? (
                      patientAppointments.map((apt) => (
                        <Card key={apt.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="font-semibold">{apt.doctorName}</p>
                                <p className="text-sm text-muted-foreground">{apt.department}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-sm flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(apt.appointmentDate).toLocaleDateString()}
                                  </span>
                                  <span className="text-sm flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {apt.timeSlot}
                                  </span>
                                </div>
                                {apt.reason && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Reason: {apt.reason}
                                  </p>
                                )}
                              </div>
                              <Badge variant={
                                apt.status === "completed" ? "default" :
                                apt.status === "scheduled" ? "secondary" : "outline"
                              }>
                                {apt.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>No appointments found</AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Quick Actions */}
                {role === "doctor" && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={() => {
                      setShowAddPrescription(true)
                      // You could pre-fill the patient name here
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Prescription for {scannedPatient.name}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Filters */}
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
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
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-white">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredPrescriptions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-white">Pending</p>
                  <p className="text-2xl font-bold">
                    {filteredPrescriptions.filter((p) => p.status === "pending").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-white">Approved</p>
                  <p className="text-2xl font-bold">
                    {filteredPrescriptions.filter((p) => p.status === "approved").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-white">Rejected</p>
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
          {filteredPrescriptions.map((prescription: Prescription) => (
            <Card key={prescription.id} className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{prescription.patientName}</h3>
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
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <span className="flex items-center"><User className="mr-2 h-4 w-4" />{prescription.doctorName}</span>
                    <span className="flex items-center"><Calendar className="mr-2 h-4 w-4" />{formatDate(prescription.createdAt)}</span>
                    <span className="flex items-center"><Pill className="mr-2 h-4 w-4" />{prescription.medicines.length} medicine(s)</span>
                  </div>
                </div>
                {/* Medicines */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white">Medicines:</h4>
                  <div className="flex flex-col gap-2">
                    {prescription.medicines.map((medicine: Prescription['medicines'][0], index: number) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
                          <span className="font-medium">{medicine.name}</span>
                          <span className="text-gray-600 dark:text-gray-300">Dosage: {medicine.dosage}</span>
                          <span className="text-gray-600 dark:text-gray-300">Frequency: {medicine.frequency}</span>
                          <span className="text-gray-600 dark:text-gray-300">Duration: {medicine.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {prescription.notes && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Notes:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-100 bg-blue-50 dark:bg-blue-900/40 p-2 rounded-lg">{prescription.notes}</p>
                  </div>
                )}
                {prescription.processedAt && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Processed by {prescription.processedBy} on {formatDate(prescription.processedAt)}
                  </div>
                )}
                {role === "pharmacist" && prescription.status === "pending" && (
                  <div className="flex flex-col gap-2 mt-4">
                    <Dialog open={approveDialogOpen && approvePrescription?.id === prescription.id} onOpenChange={open => { setApproveDialogOpen(open); if (!open) setApprovePrescription(null) }}>
                      <DialogTrigger asChild>
                        <Button onClick={() => openApproveDialog(prescription)} className="flex-1">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      </DialogTrigger>
                      <DialogContent className="glass-card bg-card backdrop-blur-xl shadow-lg">
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
                      <DialogContent className="glass-card bg-card backdrop-blur-xl shadow-lg">
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
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPrescriptions.length === 0 && (
          <Card className="glass-card bg-red-50/60 dark:bg-red-900/40 backdrop-blur-xl shadow-lg">
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
  const [recommendedFields, setRecommendedFields] = useState<{
    [index: number]: { dosage?: boolean; frequency?: boolean; duration?: boolean }
  }>({})
  // Track selected medicines separately from search input
  const [selectedMedicines, setSelectedMedicines] = useState<{
    [index: number]: string | null
  }>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("Form submission - formData:", formData)
    console.log("Form submission - selectedMedicines:", selectedMedicines)
    
    // Validate that all medicines have been selected (not just typed)
    const medicinesWithSelections = formData.medicines.map((medicine, index) => {
      const selectedMedicine = selectedMedicines[index]
      if (!selectedMedicine) {
        console.warn(`Medicine at index ${index} not selected - typed value: "${medicine.name}"`)
        return null // Medicine not selected from dropdown
      }
      console.log(`Medicine at index ${index} - selected: "${selectedMedicine}", will use for persistence`)
      return {
        ...medicine,
        name: selectedMedicine, // Use selected medicine name, not search input
      }
    })
    
    // Check if any medicine is missing a selection
    const hasUnselectedMedicines = medicinesWithSelections.some(m => m === null)
    if (hasUnselectedMedicines) {
      const unselectedIndices = medicinesWithSelections
        .map((m, i) => m === null ? i + 1 : null)
        .filter((i): i is number => i !== null)
      alert(
        `Please select a medicine from the dropdown for medicine ${unselectedIndices.join(", ")}. ` +
        `Typing alone is not sufficient - you must click on a suggestion from the autocomplete dropdown.`
      )
      return
    }
    
    // Validate all required fields are filled
    const hasIncompleteMedicines = medicinesWithSelections.some(
      med => !med!.name || !med!.dosage || !med!.frequency || !med!.duration
    )
    if (hasIncompleteMedicines) {
      alert("Please fill in all fields (name, dosage, frequency, duration) for each medicine.")
      return
    }
    
    // Build final payload with selected medicine names
    const finalPayload = {
      ...formData,
      medicines: medicinesWithSelections.filter((m): m is NonNullable<typeof m> => m !== null),
    }
    
    console.log("Submitting prescription with selected medicine names:", finalPayload)
    
    // Submit with selected medicine names
    onSubmit(finalPayload)
  }

  const addMedicine = () => {
    setFormData({
      ...formData,
      medicines: [...formData.medicines, { name: "", dosage: "", frequency: "", duration: "" }],
    })
    // Clear recommendations and selection for new medicine
    setRecommendedFields((prev) => ({
      ...prev,
      [formData.medicines.length]: {},
    }))
    setSelectedMedicines((prev) => ({
      ...prev,
      [formData.medicines.length]: null,
    }))
  }

  const removeMedicine = (index: number) => {
    setFormData({
      ...formData,
      medicines: formData.medicines.filter((_, i) => i !== index),
    })
    // Remove recommendation flags and selected medicine for deleted medicine
    setRecommendedFields((prev) => {
      const updated = { ...prev }
      delete updated[index]
      // Reindex remaining medicines
      const reindexed: typeof prev = {}
      Object.keys(updated).forEach((key) => {
        const oldIndex = parseInt(key)
        if (oldIndex > index) {
          reindexed[oldIndex - 1] = updated[oldIndex]
        } else if (oldIndex < index) {
          reindexed[oldIndex] = updated[oldIndex]
        }
      })
      return reindexed
    })
    setSelectedMedicines((prev) => {
      const updated = { ...prev }
      delete updated[index]
      // Reindex remaining medicines
      const reindexed: typeof prev = {}
      Object.keys(updated).forEach((key) => {
        const oldIndex = parseInt(key)
        if (oldIndex > index) {
          reindexed[oldIndex - 1] = updated[oldIndex]
        } else if (oldIndex < index) {
          reindexed[oldIndex] = updated[oldIndex]
        }
      })
      return reindexed
    })
  }

  const updateMedicine = (index: number, field: string, value: string, isSelection: boolean = false) => {
    const updatedMedicines = formData.medicines.map((medicine, i) =>
      i === index ? { ...medicine, [field]: value } : medicine,
    )
    setFormData({ ...formData, medicines: updatedMedicines })
    
    // If user is typing in the name field (not selecting), clear the selection
    if (field === "name" && !isSelection) {
      // Only clear selection if the value doesn't match the selected medicine
      // This allows the autocomplete to update the display without clearing selection
      const currentSelection = selectedMedicines[index]
      if (currentSelection && value !== currentSelection) {
        // User is typing something different - clear selection
        setSelectedMedicines((prev) => ({
          ...prev,
          [index]: null,
        }))
      }
    } else {
      // Clear recommendation flag when user manually edits other fields
      setRecommendedFields((prev) => ({
        ...prev,
        [index]: {
          ...prev[index],
          [field]: false,
        },
      }))
    }
  }

  // Fetch recommendations when medicine is selected from autocomplete
  const handleMedicineSelect = async (index: number, medicineName: string) => {
    if (!medicineName.trim()) return

    // Store the selected medicine name (this is the source of truth for persistence)
    setSelectedMedicines((prev) => ({
      ...prev,
      [index]: medicineName,
    }))

    // Update the form data name field to show the selected medicine (mark as selection to prevent clearing)
    updateMedicine(index, "name", medicineName, true)

    try {
      const response = await fetch(
        `/api/medicines/recommendations?name=${encodeURIComponent(medicineName)}`
      )

      if (!response.ok) {
        console.warn("Failed to fetch recommendations")
        return
      }

      const recommendations = await response.json()

      // Update medicine fields with recommendations
      const updatedMedicines = formData.medicines.map((medicine, i) =>
        i === index
          ? {
              ...medicine,
              name: medicineName, // Ensure selected name is stored
              dosage: recommendations.dosage || medicine.dosage,
              frequency: recommendations.frequency || medicine.frequency,
              duration: recommendations.duration || medicine.duration,
            }
          : medicine
      )

      setFormData({ ...formData, medicines: updatedMedicines })

      // Mark fields as recommended
      setRecommendedFields((prev) => ({
        ...prev,
        [index]: {
          dosage: !!recommendations.dosage,
          frequency: !!recommendations.frequency,
          duration: !!recommendations.duration,
        },
      }))
    } catch (error) {
      console.error("Error fetching recommendations:", error)
      // Don't block form submission on error
    }
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
          <Card key={index} className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Medicine Name *
                    {selectedMedicines[index] && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-normal">
                        (Selected)
                      </span>
                    )}
                    {!selectedMedicines[index] && medicine.name && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-normal">
                        (Please select from dropdown)
                      </span>
                    )}
                  </Label>
                  <MedicineAutocomplete
                    value={medicine.name}
                    onChange={(value) => updateMedicine(index, "name", value)}
                    onSelect={(value) => handleMedicineSelect(index, value)}
                    placeholder="Enter medicine name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Dosage *
                    {recommendedFields[index]?.dosage && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">
                        (Recommended)
                      </span>
                    )}
                  </Label>
                  <Input
                    value={medicine.dosage}
                    onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                    placeholder="e.g., 500mg"
                    required
                    className={recommendedFields[index]?.dosage ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Frequency *
                    {recommendedFields[index]?.frequency && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">
                        (Recommended)
                      </span>
                    )}
                  </Label>
                  <Select
                    value={medicine.frequency}
                    onValueChange={(value) => updateMedicine(index, "frequency", value)}
                  >
                    <SelectTrigger className={recommendedFields[index]?.frequency ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20" : ""}>
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
                  <Label className="flex items-center gap-2">
                    Duration *
                    {recommendedFields[index]?.duration && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">
                        (Recommended)
                      </span>
                    )}
                  </Label>
                  <Input
                    value={medicine.duration}
                    onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                    placeholder="e.g., 7 days"
                    required
                    className={recommendedFields[index]?.duration ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20" : ""}
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
