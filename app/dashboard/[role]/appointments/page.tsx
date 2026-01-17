"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, User, Phone, Search, CheckCircle, X, AlertCircle, Save, Settings, FileText } from "lucide-react"
import { collection, getDocs, query, where, updateDoc, doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { Appointment, Staff } from "@/lib/types"
import { formatTimeSlot } from "@/lib/appointments"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { generateBillFromAppointment, saveBill } from "@/lib/billing-utils"
import type { Prescription } from "@/lib/types"
import { addDoc } from "firebase/firestore"

export default function DoctorAppointmentsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { role } = React.use(params)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  
  // Complete appointment dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null)
  const [consultationNotes, setConsultationNotes] = useState("")
  const [prescriptionCreated, setPrescriptionCreated] = useState(false)
  
  // Prescription state
  const [createPrescription, setCreatePrescription] = useState(false)
  const [medicines, setMedicines] = useState<Array<{ name: string; dosage: string; frequency: string; duration: string }>>([{ name: "", dosage: "", frequency: "", duration: "" }])
  const [labTests, setLabTests] = useState<string[]>([""])
  const [prescriptionNotes, setPrescriptionNotes] = useState("")

  // OPD Settings state
  const [doctorData, setDoctorData] = useState<Staff | null>(null)
  const [savingOPD, setSavingOPD] = useState(false)
  const [opdSettings, setOpdSettings] = useState({
    opdAvailable: false,
    opdStartTime: "09:00",
    opdEndTime: "17:00",
    opdSlotDuration: 30,
    opdMaxPatients: 20,
    opdDays: [] as string[],
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      // Demo mode
      if (!db) {
        setAppointments([
          {
            id: "apt-demo-1",
            uhid: "UHID-202601-00001",
            patientId: "patient1",
            patientName: "John Doe",
            patientPhone: "9876543210",
            doctorId: user.uid,
            doctorName: user.name || "Dr. Demo",
            department: "Cardiology",
            appointmentDate: new Date(),
            timeSlot: "10:00",
            type: "consultation",
            status: "scheduled",
            reason: "Chest pain, shortness of breath",
            createdAt: new Date(),
            createdBy: "receptionist",
            queueNumber: 1,
            voiceBooked: false
          },
          {
            id: "apt-demo-2",
            uhid: "UHID-202601-00002",
            patientId: "patient2",
            patientName: "Jane Smith",
            patientPhone: "9876543211",
            doctorId: user.uid,
            doctorName: user.name || "Dr. Demo",
            department: "Cardiology",
            appointmentDate: new Date(Date.now() + 86400000),
            timeSlot: "11:00",
            type: "follow-up",
            status: "scheduled",
            reason: "Follow-up checkup",
            createdAt: new Date(),
            createdBy: "patient",
            queueNumber: 2,
            voiceBooked: false
          }
        ] as Appointment[])
        setLoading(false)
        return
      }

      try {
        const appointmentsRef = collection(db, "appointments")
        let q = query(appointmentsRef)
        
        // Filter by doctor for doctor role
        if (role === "doctor") {
          // Try to match by doctorId or doctorName
          q = query(appointmentsRef, where("doctorId", "==", user.uid))
          const snapshot = await getDocs(q)
          
          let appointmentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
          
          // If no appointments found by doctorId, try by doctorName
          if (appointmentsList.length === 0 && user.name) {
            q = query(appointmentsRef, where("doctorName", "==", user.name))
            const snapshotByName = await getDocs(q)
            appointmentsList = snapshotByName.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
          }
          
          setAppointments(
            appointmentsList.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
          )
        } else {
          // For other roles (receptionist, nurse), show all appointments
          const snapshot = await getDocs(appointmentsRef)
          setAppointments(
            snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
              .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
          )
        }
      } catch (error) {
        console.error("Error fetching appointments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, role])

  // Fetch OPD settings for doctor
  useEffect(() => {
    const fetchDoctorData = async () => {
      if (!user || role !== "doctor") return

      if (!db) {
        // Demo mode
        setDoctorData({
          id: user.uid,
          name: user.name || "Dr. Demo",
          role: "doctor",
          email: user.email || "",
          phone: "9876543210",
          department: "Cardiology",
          status: "active",
          joinDate: new Date(),
          opdAvailable: true,
          opdTimings: {
            days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
            startTime: "09:00",
            endTime: "17:00",
            slotDuration: 30,
            maxPatientsPerDay: 20
          }
        } as Staff)
        setOpdSettings({
          opdAvailable: true,
          opdStartTime: "09:00",
          opdEndTime: "17:00",
          opdSlotDuration: 30,
          opdMaxPatients: 20,
          opdDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
        })
        return
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid || "demo"))
        if (userDoc.exists()) {
          const data = userDoc.data() as Staff
          setDoctorData(data)
          
          if (data.opdTimings) {
            setOpdSettings({
              opdAvailable: data.opdAvailable || false,
              opdStartTime: data.opdTimings.startTime || "09:00",
              opdEndTime: data.opdTimings.endTime || "17:00",
              opdSlotDuration: data.opdTimings.slotDuration || 30,
              opdMaxPatients: data.opdTimings.maxPatientsPerDay || 20,
              opdDays: data.opdTimings.days || []
            })
          }
        }
      } catch (error) {
        console.error("Error fetching doctor data:", error)
      }
    }

    if (role === "doctor") {
      fetchDoctorData()
    }
  }, [user, role])

  const getFilteredAppointments = () => {
    let filtered = appointments

    // Search filter - improved with better matching
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(apt =>
        apt.patientName.toLowerCase().includes(searchLower) ||
        apt.uhid.toLowerCase().includes(searchLower) ||
        apt.patientPhone.includes(searchTerm) ||
        apt.reason?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter - simplified for doctors
    if (statusFilter === "active") {
      filtered = filtered.filter(apt => apt.status !== "cancelled" && apt.status !== "completed")
    } else if (statusFilter === "cancelled") {
      filtered = filtered.filter(apt => apt.status === "cancelled")
    } else if (statusFilter === "completed") {
      filtered = filtered.filter(apt => apt.status === "completed")
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(apt => apt.status === statusFilter)
    }

    // Date filter - improved with proper date handling
    if (dateFilter === "today") {
      const today = new Date().setHours(0, 0, 0, 0)
      filtered = filtered.filter(apt => {
        const aptDate = apt.appointmentDate instanceof Date 
          ? apt.appointmentDate 
          : new Date((apt.appointmentDate as any)?.seconds ? (apt.appointmentDate as any).seconds * 1000 : apt.appointmentDate)
        return aptDate.setHours(0, 0, 0, 0) === today
      })
    } else if (dateFilter === "upcoming") {
      const today = new Date().setHours(0, 0, 0, 0)
      filtered = filtered.filter(apt => {
        const aptDate = apt.appointmentDate instanceof Date 
          ? apt.appointmentDate 
          : new Date((apt.appointmentDate as any)?.seconds ? (apt.appointmentDate as any).seconds * 1000 : apt.appointmentDate)
        return aptDate.setHours(0, 0, 0, 0) >= today
      })
    } else if (dateFilter === "past") {
      const today = new Date().setHours(0, 0, 0, 0)
      filtered = filtered.filter(apt => {
        const aptDate = apt.appointmentDate instanceof Date 
          ? apt.appointmentDate 
          : new Date((apt.appointmentDate as any)?.seconds ? (apt.appointmentDate as any).seconds * 1000 : apt.appointmentDate)
        return aptDate.setHours(0, 0, 0, 0) < today
      })
    }

    return filtered
  }

  const handleStartConsultation = async (appointment: Appointment) => {
    try {
      if (db) {
        await updateDoc(doc(db, "appointments", appointment.id), { 
          status: "in-progress",
          consultationStartTime: new Date()
        })
      }
      
      setAppointments(prev =>
        prev.map(apt => apt.id === appointment.id ? { ...apt, status: "in-progress" } : apt)
      )
      
      toast({
        title: "Consultation Started",
        description: `Consultation with ${appointment.patientName} has begun`,
      })
    } catch (error) {
      console.error("Error starting consultation:", error)
      toast({
        title: "Error",
        description: "Failed to start consultation",
        variant: "destructive"
      })
    }
  }

  const handleCompleteConsultation = async () => {
    if (!completingAppointment || !user) return
    
    if (!consultationNotes.trim()) {
      toast({
        title: "Missing Information",
        description: "Please add consultation notes before completing",
        variant: "destructive"
      })
      return
    }

    try {
      // Get patient data
      let patient = null
      if (db) {
        const patientsSnapshot = await getDocs(collection(db, "patients"))
        patient = patientsSnapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(p => p.id === completingAppointment.patientId || (p as any).uhid === completingAppointment.uhid)
      }
      
      if (!patient) {
        throw new Error("Patient not found")
      }

      let prescriptionId: string | undefined = undefined

      // Create prescription if requested
      if (createPrescription && db) {
        const validMedicines = medicines.filter(m => m.name.trim())
        const validLabTests = labTests.filter(t => t.trim())
        
        if (validMedicines.length > 0 || validLabTests.length > 0) {
          const prescription: Omit<Prescription, "id"> = {
            patientId: completingAppointment.patientId,
            patientName: completingAppointment.patientName,
            patientUhid: completingAppointment.uhid,
            doctorId: user.uid,
            doctorName: user.name || "Doctor",
            appointmentId: completingAppointment.id,
            medicines: validMedicines,
            labTests: validLabTests,
            notes: prescriptionNotes,
            status: "pending",
            createdAt: new Date(),
            dispensedFromHospital: false
          }
          
          const prescriptionRef = await addDoc(collection(db, "prescriptions"), prescription)
          prescriptionId = prescriptionRef.id
          setPrescriptionCreated(true)
        }
      }

      // Generate bill IMMEDIATELY
      const bill = await generateBillFromAppointment(
        completingAppointment,
        patient as any,
        { uid: user.uid, name: user.name || "Doctor" }
      )
      
      await saveBill(bill)

      // Update appointment with bill ID, prescription ID, and notes
      if (db) {
        await updateDoc(doc(db, "appointments", completingAppointment.id), { 
          status: "completed",
          consultationEndTime: new Date(),
          consultationNotes,
          billId: bill.id,
          ...(prescriptionId && { prescriptionId })
        })
      }

      setAppointments(prev =>
        prev.map(apt => 
          apt.id === completingAppointment.id 
            ? { ...apt, status: "completed", billId: bill.id, consultationNotes } 
            : apt
        )
      )

      toast({
        title: "Consultation Completed!",
        description: `Bill ${bill.billNumber} generated for ₹${bill.total}. Patient must pay before leaving.`,
        duration: 10000,
      })

      setCompleteDialogOpen(false)
      setConsultationNotes("")
      setPrescriptionCreated(false)
      setCreatePrescription(false)
      setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }])
      setLabTests([""])
      setPrescriptionNotes("")
    } catch (error) {
      console.error("Error completing consultation:", error)
      toast({
        title: "Error",
        description: "Failed to complete consultation and generate bill",
        variant: "destructive"
      })
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: "completed" | "cancelled") => {
    try {
      if (db) {
        await updateDoc(doc(db, "appointments", appointmentId), { status: newStatus })
      }

      setAppointments(prev =>
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: newStatus } : apt)
      )

      toast({
        title: "Status Updated",
        description: `Appointment marked as ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Update Failed",
        description: "Could not update appointment status",
        variant: "destructive"
      })
    }
  }

  const handleCancelWithReason = async () => {
    if (!cancellingAppointment || !cancelReason.trim()) {
      toast({
        title: "Cancellation Reason Required",
        description: "Please provide a reason for cancellation",
        variant: "destructive"
      })
      return
    }

    try {
      if (db) {
        await updateDoc(doc(db, "appointments", cancellingAppointment.id), {
          status: "cancelled",
          cancellationReason: cancelReason,
          cancelledAt: new Date(),
          cancelledBy: user?.uid || "doctor"
        })
      }

      setAppointments(prev =>
        prev.map(apt =>
          apt.id === cancellingAppointment.id
            ? { ...apt, status: "cancelled" as const, cancellationReason: cancelReason }
            : apt
        )
      )

      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled successfully",
      })

      setCancelDialogOpen(false)
      setCancellingAppointment(null)
      setCancelReason("")
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Cancellation Failed",
        description: "Could not cancel the appointment",
        variant: "destructive"
      })
    }
  }

  const formatAppointmentDate = (date: any) => {
    if (!date) return "Date not set"
    try {
      const dateObj = date instanceof Date ? date : new Date(date.seconds ? date.seconds * 1000 : date)
      return dateObj.toLocaleDateString()
    } catch (error) {
      return "Invalid date"
    }
  }

  const handleSaveOPDSettings = async () => {
    if (!user || !db) return

    setSavingOPD(true)
    try {
      const userRef = doc(db, "users", user.uid)
      await setDoc(userRef, {
        opdTimings: {
          days: opdSettings.opdDays,
          startTime: opdSettings.opdStartTime,
          endTime: opdSettings.opdEndTime,
          slotDuration: opdSettings.opdSlotDuration,
          maxPatientsPerDay: opdSettings.opdMaxPatients
        }
      }, { merge: true })

      toast({
        title: "OPD Settings Saved",
        description: "Your OPD timings have been updated successfully",
      })
    } catch (error) {
      console.error("Error saving OPD settings:", error)
      toast({
        title: "Save Failed",
        description: "Could not save OPD settings",
        variant: "destructive"
      })
    } finally {
      setSavingOPD(false)
    }
  }

  const toggleOPDDay = (day: string) => {
    setOpdSettings(prev => ({
      ...prev,
      opdDays: prev.opdDays.includes(day)
        ? prev.opdDays.filter(d => d !== day)
        : [...prev.opdDays, day]
    }))
  }

  const calculateEstimatedSlots = () => {
    if (!opdSettings.opdStartTime || !opdSettings.opdEndTime) return 0
    const [startHour, startMin] = opdSettings.opdStartTime.split(":").map(Number)
    const [endHour, endMin] = opdSettings.opdEndTime.split(":").map(Number)
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    return Math.floor(totalMinutes / opdSettings.opdSlotDuration)
  }

  const filteredAppointments = getFilteredAppointments()
  const todayAppointments = appointments.filter(apt => 
    new Date(apt.appointmentDate).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)
  )

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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {role === "doctor" ? "OPD Management" : "Appointments"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {role === "doctor" ? "Manage your appointments and OPD settings" : "View and manage all appointments"}
          </p>
        </div>

        {role === "doctor" ? (
          <Tabs defaultValue="appointments" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="appointments" className="cursor-pointer w-full">Appointments</TabsTrigger>
              <TabsTrigger value="opd-settings" className="cursor-pointer w-full">OPD Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="space-y-6 mt-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments.filter(apt => apt.status === "scheduled").length}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments.filter(apt => apt.status === "completed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by patient name, UHID, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Appointments</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        {filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {filteredAppointments.map((apt) => (
              <Card key={apt.id} className="glass-card bg-card backdrop-blur-xl shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{apt.patientName}</h3>
                          <p className="text-sm text-muted-foreground">UHID: {apt.uhid}</p>
                        </div>
                        <Badge variant={
                          apt.status === "completed" ? "default" :
                          apt.status === "scheduled" ? "secondary" :
                          apt.status === "in-progress" ? "outline" :
                          apt.status === "cancelled" ? "destructive" : "outline"
                        }>
                          {apt.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatAppointmentDate(apt.appointmentDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatTimeSlot(apt.timeSlot)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{apt.patientPhone}</span>
                        </div>
                      </div>

                      {apt.reason && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm"><strong>Symptoms:</strong> {apt.reason}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{apt.type}</Badge>
                        <span>Queue #{apt.queueNumber}</span>
                        {apt.voiceBooked && <Badge variant="outline">Voice Booked</Badge>}
                      </div>
                    </div>

                    {/* Actions */}
                    {apt.status !== "completed" && apt.status !== "cancelled" && (
                      <div className="flex flex-col gap-2">
                        {role === "doctor" ? (
                          /* Doctor actions */
                          <>
                            {apt.status === "scheduled" && (
                              <Button
                                size="sm"
                                onClick={() => handleStartConsultation(apt)}
                                className="w-full md:w-auto"
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Start Consultation
                              </Button>
                            )}
                            {apt.status === "in-progress" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setCompletingAppointment(apt)
                                  setCompleteDialogOpen(true)
                                }}
                                className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete & Bill
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setCancellingAppointment(apt)
                                setCancelDialogOpen(true)
                              }}
                              className="w-full md:w-auto"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          /* Other roles see mark complete button */
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(apt.id, "completed")}
                              className="w-full md:w-auto"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(apt.id, "cancelled")}
                              className="w-full md:w-auto"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No appointments found</p>
              </div>
            </CardContent>
          </Card>
        )}
            </TabsContent>

            <TabsContent value="opd-settings" className="space-y-6 mt-6">
              {/* OPD Permission Check */}
              {!doctorData?.opdAvailable ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    OPD access has not been enabled for your account. Please contact the administrator to enable OPD availability.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* OPD Timing Settings */}
                  <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        OPD Timing Configuration
                      </CardTitle>
                      <CardDescription>Set your consultation hours and slot duration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Time Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startTime">OPD Start Time</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={opdSettings.opdStartTime}
                            onChange={(e) => setOpdSettings({ ...opdSettings, opdStartTime: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endTime">OPD End Time</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={opdSettings.opdEndTime}
                            onChange={(e) => setOpdSettings({ ...opdSettings, opdEndTime: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Slot Duration */}
                      <div>
                        <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
                        <Select
                          value={opdSettings.opdSlotDuration.toString()}
                          onValueChange={(value) => setOpdSettings({ ...opdSettings, opdSlotDuration: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="20">20 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Max Patients */}
                      <div>
                        <Label htmlFor="maxPatients">Maximum Patients Per Day</Label>
                        <Input
                          id="maxPatients"
                          type="number"
                          min="1"
                          max="100"
                          value={opdSettings.opdMaxPatients}
                          onChange={(e) => setOpdSettings({ ...opdSettings, opdMaxPatients: parseInt(e.target.value) })}
                        />
                      </div>

                      {/* Working Days */}
                      <div>
                        <Label className="mb-3 block">Working Days</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                            <Button
                              key={day}
                              type="button"
                              variant={opdSettings.opdDays.includes(day) ? "default" : "outline"}
                              onClick={() => toggleOPDDay(day)}
                              className="capitalize"
                            >
                              {day.slice(0, 3)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="space-y-2 text-sm">
                            <p>
                              <strong>Schedule Summary:</strong>
                            </p>
                            <p>• Working {opdSettings.opdDays.length} days per week</p>
                            <p>• {calculateEstimatedSlots()} appointment slots per day</p>
                            <p>• Max {opdSettings.opdMaxPatients} patients per day</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Button onClick={handleSaveOPDSettings} disabled={savingOPD} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        {savingOPD ? "Saving..." : "Save OPD Settings"}
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Non-doctor view - just appointments */
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appointments.length}</div>
                </CardContent>
              </Card>
              <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayAppointments.length}</div>
                </CardContent>
              </Card>
              <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === "scheduled").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === "completed").length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by patient name, UHID, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Appointments List */}
            {filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                {filteredAppointments.map((apt) => (
                  <Card key={apt.id} className="glass-card bg-card backdrop-blur-xl shadow-lg">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{apt.patientName}</h3>
                              <p className="text-sm text-muted-foreground">UHID: {apt.uhid}</p>
                            </div>
                            <Badge variant={
                              apt.status === "completed" ? "default" :
                              apt.status === "scheduled" ? "secondary" :
                              apt.status === "in-progress" ? "outline" :
                              apt.status === "cancelled" ? "destructive" : "outline"
                            }>
                              {apt.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatAppointmentDate(apt.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatTimeSlot(apt.timeSlot)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{apt.patientPhone}</span>
                            </div>
                          </div>

                          {apt.reason && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm"><strong>Symptoms:</strong> {apt.reason}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{apt.type}</Badge>
                            <span>Queue #{apt.queueNumber}</span>
                            {apt.voiceBooked && <Badge variant="outline">Voice Booked</Badge>}
                          </div>
                        </div>

                        {/* Actions */}
                        {apt.status !== "completed" && apt.status !== "cancelled" && (
                          <div className="flex flex-col gap-2">
                            {apt.status === "scheduled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(apt.id, "completed")}
                                className="w-full md:w-auto"
                              >
                                Mark Complete
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(apt.id, "cancelled")}
                              className="w-full md:w-auto"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
                <CardContent className="py-12">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No appointments found</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Cancel Appointment Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for cancelling this appointment with {cancellingAppointment?.patientName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="cancelReason">Cancellation Reason *</Label>
              <Textarea
                id="cancelReason"
                placeholder="Enter reason for cancellation (e.g., doctor unavailable, patient request, emergency, etc.)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setCancelReason("")
                setCancellingAppointment(null)
              }}>
                Keep Appointment
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                disabled={!cancelReason.trim()}
                onClick={() => {
                  if (cancellingAppointment) {
                    handleStatusChange(cancellingAppointment.id, "cancelled")
                    setCancelDialogOpen(false)
                    setCancelReason("")
                    setCancellingAppointment(null)
                  }
                }}
              >
                Cancel Appointment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Complete Consultation Dialog */}
        <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Complete Consultation
              </AlertDialogTitle>
              <AlertDialogDescription>
                Completing consultation for {completingAppointment?.patientName}. Bill will be generated immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Once completed, the consultation bill will be generated instantly. 
                  Patient must pay before leaving OPD.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="consultationNotes">Consultation Notes / Diagnosis *</Label>
                <Textarea
                  id="consultationNotes"
                  placeholder="Enter consultation notes, diagnosis, treatment plan, etc."
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>

              {/* Prescription Creation Section */}
              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Create Prescription</p>
                      <p className="text-xs text-muted-foreground">Optional - Add medicines and lab tests</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={createPrescription ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreatePrescription(!createPrescription)}
                  >
                    {createPrescription ? "Hide" : "Add Prescription"}
                  </Button>
                </div>

                {createPrescription && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Medicines */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Medicines</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }])}
                        >
                          + Add Medicine
                        </Button>
                      </div>
                      {medicines.map((medicine, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2">
                          <Input
                            placeholder="Medicine name"
                            value={medicine.name}
                            onChange={(e) => {
                              const updated = [...medicines]
                              updated[index].name = e.target.value
                              setMedicines(updated)
                            }}
                            className="col-span-3"
                          />
                          <Input
                            placeholder="Dosage"
                            value={medicine.dosage}
                            onChange={(e) => {
                              const updated = [...medicines]
                              updated[index].dosage = e.target.value
                              setMedicines(updated)
                            }}
                            className="col-span-3"
                          />
                          <Input
                            placeholder="Frequency"
                            value={medicine.frequency}
                            onChange={(e) => {
                              const updated = [...medicines]
                              updated[index].frequency = e.target.value
                              setMedicines(updated)
                            }}
                            className="col-span-3"
                          />
                          <Input
                            placeholder="Duration"
                            value={medicine.duration}
                            onChange={(e) => {
                              const updated = [...medicines]
                              updated[index].duration = e.target.value
                              setMedicines(updated)
                            }}
                            className="col-span-2"
                          />
                          {medicines.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setMedicines(medicines.filter((_, i) => i !== index))}
                              className="col-span-1"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Lab Tests */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Lab Tests</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setLabTests([...labTests, ""])}
                        >
                          + Add Test
                        </Button>
                      </div>
                      {labTests.map((test, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Lab test name"
                            value={test}
                            onChange={(e) => {
                              const updated = [...labTests]
                              updated[index] = e.target.value
                              setLabTests(updated)
                            }}
                          />
                          {labTests.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setLabTests(labTests.filter((_, i) => i !== index))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Prescription Notes */}
                    <div className="space-y-2">
                      <Label>Additional Instructions</Label>
                      <Textarea
                        placeholder="Diet advice, precautions, follow-up instructions..."
                        value={prescriptionNotes}
                        onChange={(e) => setPrescriptionNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Billing</p>
                  <p className="text-xs text-muted-foreground">
                    Bill will be generated automatically based on consultation type and specialty
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">What happens next:</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Consultation bill generated with fee: ₹500-1200</li>
                  <li>Patient redirected to billing counter</li>
                  <li>Prescription visible in patient dashboard</li>
                  <li>Patient can choose to buy medicines from hospital or outside</li>
                  <li>Payment required before leaving</li>
                </ol>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setConsultationNotes("")
                setCompletingAppointment(null)
                setCreatePrescription(false)
                setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }])
                setLabTests([""])
                setPrescriptionNotes("")
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-green-600 hover:bg-green-700"
                disabled={!consultationNotes.trim()}
                onClick={handleCompleteConsultation}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete & Generate Bill
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Appointment Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for cancellation. This will be recorded in the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setCancelDialogOpen(false)
                setCancellingAppointment(null)
                setCancelReason("")
              }}>
                Keep Appointment
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelWithReason}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel Appointment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
