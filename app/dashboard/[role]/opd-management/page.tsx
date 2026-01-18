"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, Search, UserPlus, Clock, User, Filter, Plus, Eye, Calendar as CalIcon, Receipt } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/components/providers/auth-provider"
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Staff, Patient, Appointment } from "@/lib/types"
import { generateTimeSlots, isSlotAvailable, getNextQueueNumber, formatTimeSlot } from "@/lib/appointments"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

export default function OPDManagementPage({ params }: { params: Promise<{ role: string }> }) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { role } = React.use(params)
  
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Staff[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDoctor, setFilterDoctor] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDate, setFilterDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<"today" | "all">("today")
  
  // Booking Dialog
  const [showBookDialog, setShowBookDialog] = useState(false)
  const [searchPatient, setSearchPatient] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("")
  const [appointmentType, setAppointmentType] = useState<"consultation" | "follow-up">("consultation")
  const [symptoms, setSymptoms] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  
  // New patient form
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    age: "",
    gender: "male" as "male" | "female" | "other",
    phone: "",
    email: "",
    address: ""
  })

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    if (!db) {
      // Demo mode
      setPatients([
        { id: "p1", uhid: "UHID-202601-00001", name: "John Doe", age: 30, gender: "male", phone: "9876543210", email: "john@demo.com", address: "Demo Address", status: "stable", medicalHistory: [] },
      ] as Patient[])
      setDoctors([
        { id: "doc1", name: "Dr. Smith", role: "doctor", department: "Cardiology", email: "doc1@demo.com", phone: "9876543210", status: "active", joinDate: new Date(), opdAvailable: true },
      ] as Staff[])
      setLoading(false)
      return
    }

    try {
      // Fetch patients
      const patientsRef = collection(db, "patients")
      const patientsSnapshot = await getDocs(patientsRef)
      setPatients(patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))

      // Fetch doctors
      const usersRef = collection(db, "users")
      const doctorsQuery = query(usersRef, where("role", "==", "doctor"))
      const doctorsSnapshot = await getDocs(doctorsQuery)
      const doctorsList = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff))
      
      const opdDoctors = doctorsList.filter(doc => doc.opdAvailable === true)
      setDoctors(opdDoctors.length > 0 ? opdDoctors : doctorsList)

      // Fetch appointments
      const appointmentsRef = collection(db, "appointments")
      const aptSnapshot = await getDocs(appointmentsRef)
      setAppointments(aptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)))
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter appointments
  const filteredAppointments = appointments.filter(apt => {
    const aptDate = apt.appointmentDate instanceof Date ? apt.appointmentDate : new Date(apt.appointmentDate)
    const matchesDate = viewMode === "all" || aptDate.toDateString() === filterDate.toDateString()
    const matchesDoctor = filterDoctor === "all" || apt.doctorId === filterDoctor
    const matchesStatus = filterStatus === "all" || apt.status === filterStatus
    const matchesSearch = searchTerm === "" || 
      apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesDate && matchesDoctor && matchesStatus && matchesSearch
  })

  // Group appointments by doctor
  const appointmentsByDoctor = doctors.map(doctor => {
    const doctorApts = filteredAppointments.filter(apt => apt.doctorId === doctor.id)
    return {
      doctor,
      appointments: doctorApts.sort((a, b) => {
        const timeA = a.timeSlot || ""
        const timeB = b.timeSlot || ""
        return timeA.localeCompare(timeB)
      }),
      totalPatients: doctorApts.length,
      scheduledCount: doctorApts.filter(a => a.status === "scheduled").length,
      completedCount: doctorApts.filter(a => a.status === "completed").length,
    }
  })

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.uhid?.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.phone.includes(searchPatient)
  )

  const timeSlots = generateTimeSlots(9, 17, 30)
  const availableSlots = selectedDate && selectedDoctor
    ? timeSlots.filter(slot => isSlotAvailable(appointments, selectedDate, slot, selectedDoctor))
    : []

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPatient || !selectedPatient.uhid) {
      toast({ title: "Error", description: "Please select a valid patient", variant: "destructive" })
      return
    }

    if (!selectedDoctor || !selectedDate || !selectedTimeSlot) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    if (!symptoms.trim()) {
      toast({ title: "Error", description: "Please enter symptoms", variant: "destructive" })
      return
    }

    setSubmitting(true)

    try {
      const doctor = doctors.find(d => d.id === selectedDoctor)
      if (!doctor) throw new Error("Doctor not found")

      const appointment: Appointment = {
        id: `APT-${Date.now()}`,
        uhid: selectedPatient.uhid,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientPhone: selectedPatient.phone,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: doctor.department || "General",
        appointmentDate: selectedDate,
        timeSlot: selectedTimeSlot,
        type: appointmentType,
        status: "scheduled",
        reason: symptoms,
        notes: notes || "",
        createdAt: new Date(),
        createdBy: user?.uid || "receptionist",
        queueNumber: getNextQueueNumber(appointments, selectedDate),
        voiceBooked: false
      }

      if (db) {
        await setDoc(doc(db, "appointments", appointment.id), appointment)
      }

      toast({
        title: "Appointment Booked!",
        description: `${selectedPatient.name} with Dr. ${doctor.name} at ${formatTimeSlot(selectedTimeSlot)}`,
      })

      // Refresh and reset
      await fetchData()
      resetBookingForm()
      setShowBookDialog(false)
    } catch (error) {
      console.error("Error booking:", error)
      toast({ title: "Booking Failed", description: "Please try again", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddNewPatient = async () => {
    if (!newPatientData.name || !newPatientData.phone || !newPatientData.age) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" })
      return
    }

    try {
      const uhid = `UHID-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`

      const newPatient: Patient = {
        id: `patient-${Date.now()}`,
        uhid,
        name: newPatientData.name,
        age: Number(newPatientData.age),
        gender: newPatientData.gender,
        phone: newPatientData.phone,
        email: newPatientData.email || "",
        address: newPatientData.address || "",
        status: "stable",
        medicalHistory: []
      }

      if (db) {
        await setDoc(doc(db, "patients", newPatient.id), {
          uhid: newPatient.uhid,
          name: newPatient.name,
          age: newPatient.age,
          gender: newPatient.gender,
          phone: newPatient.phone,
          email: newPatient.email,
          address: newPatient.address,
          status: newPatient.status,
          medicalHistory: newPatient.medicalHistory,
          createdAt: new Date()
        })
      }

      setPatients([...patients, newPatient])
      setSelectedPatient(newPatient)
      toast({ title: "Patient Added", description: `UHID: ${uhid}` })
      setShowNewPatient(false)
      setNewPatientData({ name: "", age: "", gender: "male", phone: "", email: "", address: "" })
    } catch (error) {
      toast({ title: "Failed", description: "Error adding patient", variant: "destructive" })
    }
  }

  const resetBookingForm = () => {
    setSelectedPatient(null)
    setSelectedDoctor("")
    setSelectedDate(new Date())
    setSelectedTimeSlot("")
    setSymptoms("")
    setNotes("")
    setSearchPatient("")
  }

  if (loading) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const todayStats = {
    total: filteredAppointments.length,
    scheduled: filteredAppointments.filter(a => a.status === "scheduled").length,
    completed: filteredAppointments.filter(a => a.status === "completed").length,
    cancelled: filteredAppointments.filter(a => a.status === "cancelled").length,
  }

  const displayTitle = viewMode === "today" 
    ? `Appointments - ${filterDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
    : "All Appointments"

  return (
    <DashboardLayout role={role}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">OPD Management</h1>
            <p className="text-muted-foreground">Manage appointments and doctor schedules</p>
          </div>
          <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Book New Appointment</DialogTitle>
                <DialogDescription>Book appointment for walk-in patient</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleBookAppointment} className="space-y-4">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <Label>Search Patient</Label>
                  <Input
                    placeholder="Search by name, UHID, or phone..."
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                  />
                </div>

                {selectedPatient ? (
                  <Card className="border-2 border-emerald-500">
                    <CardContent className="pt-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{selectedPatient.name}</p>
                        <p className="text-sm text-muted-foreground">UHID: {selectedPatient.uhid}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                        Change
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                      {filteredPatients.slice(0, 5).map((patient) => (
                        <Card
                          key={patient.id}
                          className="cursor-pointer hover:border-emerald-500 transition-colors"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <CardContent className="pt-3 pb-3">
                            <p className="font-medium text-sm">{patient.name}</p>
                            <p className="text-xs text-muted-foreground">{patient.uhid} • {patient.phone}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={() => setShowNewPatient(!showNewPatient)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New Patient
                    </Button>
                  </>
                )}

                {showNewPatient && (
                  <Card className="border-2 border-blue-500">
                    <CardContent className="pt-4 space-y-3">
                      <Input placeholder="Full Name *" value={newPatientData.name} onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })} />
                      <Input placeholder="Age *" type="number" value={newPatientData.age} onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value })} />
                      <Select value={newPatientData.gender} onValueChange={(value: any) => setNewPatientData({ ...newPatientData, gender: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Phone *" value={newPatientData.phone} onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })} />
                      <Input placeholder="Email" value={newPatientData.email} onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })} />
                      <Input placeholder="Address" value={newPatientData.address} onChange={(e) => setNewPatientData({ ...newPatientData, address: e.target.value })} />
                      <Button type="button" onClick={handleAddNewPatient} className="w-full">Create Patient</Button>
                    </CardContent>
                  </Card>
                )}

                {/* Doctor & Date Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Doctor *</Label>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                      <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                      <SelectContent>
                        {doctors.map(doctor => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.name} - {doctor.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-2">
                  <Label>Time Slot *</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map(slot => (
                      <Button
                        key={slot}
                        type="button"
                        size="sm"
                        variant={selectedTimeSlot === slot ? "default" : "outline"}
                        onClick={() => setSelectedTimeSlot(slot)}
                      >
                        {formatTimeSlot(slot)}
                      </Button>
                    ))}
                  </div>
                  {availableSlots.length === 0 && selectedDoctor && selectedDate && (
                    <p className="text-sm text-muted-foreground">No slots available</p>
                  )}
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={appointmentType === "consultation" ? "default" : "outline"} onClick={() => setAppointmentType("consultation")}>
                      Consultation
                    </Button>
                    <Button type="button" size="sm" variant={appointmentType === "follow-up" ? "default" : "outline"} onClick={() => setAppointmentType("follow-up")}>
                      Follow-up
                    </Button>
                  </div>
                </div>

                {/* Symptoms */}
                <div className="space-y-2">
                  <Label>Symptoms / Reason *</Label>
                  <Textarea placeholder="Describe symptoms..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} required />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>

                <Button type="submit" className="w-full" disabled={!selectedPatient || submitting}>
                  {submitting ? "Booking..." : "Confirm Appointment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {viewMode === "today" ? "Today's" : "Total"} Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{todayStats.scheduled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{todayStats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{todayStats.cancelled}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>View Mode</Label>
                <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today Only</SelectItem>
                    <SelectItem value="all">All Appointments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date {viewMode === "today" && "*"}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn(
                        "w-full justify-start h-10",
                        viewMode === "all" && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={viewMode === "all"}
                    >
                      <CalIcon className="mr-2 h-4 w-4" />
                      {filterDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 shadow-lg" align="start">
                    <Calendar 
                      mode="single" 
                      selected={filterDate} 
                      onSelect={(date) => date && setFilterDate(date)}
                      className="rounded-md border"
                      classNames={{
                        months: "space-y-4",
                        month: "space-y-4",
                        caption: "flex justify-center pt-1 relative items-center px-4",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: cn(
                          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-accent rounded-md"
                        ),
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                        row: "flex w-full mt-2",
                        cell: cn(
                          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                          "h-9 w-9"
                        ),
                        day: cn(
                          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                        ),
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold",
                        day_today: "bg-accent text-accent-foreground font-semibold",
                        day_outside: "text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Doctor</Label>
                <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>Dr. {doc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Patient or doctor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments by Doctor */}
        <Tabs defaultValue="by-doctor" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="by-doctor">By Doctor</TabsTrigger>
            <TabsTrigger value="all-appointments">All Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="by-doctor" className="space-y-4">
            {appointmentsByDoctor.map(({ doctor, appointments, totalPatients, scheduledCount, completedCount }) => (
              <Card key={doctor.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Dr. {doctor.name}</CardTitle>
                      <CardDescription>{doctor.department} • {doctor.specialization || "General"}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{totalPatients} Patients</Badge>
                      <Badge variant="default" className="bg-blue-600">{scheduledCount} Scheduled</Badge>
                      <Badge variant="default" className="bg-green-600">{completedCount} Done</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {appointments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Queue</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>UHID</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.map(apt => (
                          <TableRow key={apt.id}>
                            <TableCell className="font-mono font-bold">#{apt.queueNumber}</TableCell>
                            <TableCell className="font-medium">{formatTimeSlot(apt.timeSlot)}</TableCell>
                            <TableCell>{apt.patientName}</TableCell>
                            <TableCell className="font-mono text-xs">{apt.uhid}</TableCell>
                            <TableCell>{apt.patientPhone}</TableCell>
                            <TableCell className="max-w-xs truncate">{apt.reason}</TableCell>
                            <TableCell>
                              <Badge variant={
                                apt.status === "completed" ? "default" :
                                apt.status === "scheduled" ? "secondary" :
                                "destructive"
                              }>
                                {apt.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {apt.status === "completed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/${role}/billing`)}
                                >
                                  <Receipt className="h-3 w-3 mr-1" />
                                  View Bill
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No appointments for this doctor today</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="all-appointments">
            <Card>
              <CardHeader>
                <CardTitle>{displayTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAppointments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Queue</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments
                        .sort((a, b) => (a.timeSlot || "").localeCompare(b.timeSlot || ""))
                        .map(apt => (
                          <TableRow key={apt.id}>
                            <TableCell className="font-mono font-bold">#{apt.queueNumber}</TableCell>
                            <TableCell className="font-medium">{formatTimeSlot(apt.timeSlot)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{apt.patientName}</p>
                                <p className="text-xs text-muted-foreground">{apt.uhid}</p>
                              </div>
                            </TableCell>
                            <TableCell>{apt.doctorName}</TableCell>
                            <TableCell>{apt.department}</TableCell>
                            <TableCell className="max-w-xs truncate">{apt.reason}</TableCell>
                            <TableCell>
                              <Badge variant={
                                apt.status === "completed" ? "default" :
                                apt.status === "scheduled" ? "secondary" :
                                "destructive"
                              }>
                                {apt.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {apt.status === "completed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/${role}/billing`)}
                                >
                                  <Receipt className="h-3 w-3 mr-1" />
                                  Bill
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No appointments found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
