"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, Search, UserPlus, Clock, User, Phone } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/components/providers/auth-provider"
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Staff, Patient, Appointment } from "@/lib/types"
import { generateTimeSlots, isSlotAvailable, getNextQueueNumber, formatTimeSlot, getDepartments } from "@/lib/appointments"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import DashboardLayout from "@/components/layout/dashboard-layout"

export default function ReceptionistAppointmentBookingPage({ params }: { params: Promise<{ role: string }> }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { role } = React.use(params)
  
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Staff[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Patient search
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showNewPatient, setShowNewPatient] = useState(false)
  
  // Form state
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
    const fetchData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      if (!db) {
        // Demo mode
        setPatients([
          { id: "p1", uhid: "UHID-202601-00001", name: "John Doe", age: 30, gender: "male", phone: "9876543210", email: "john@demo.com", address: "Demo Address", status: "stable" },
        ] as Patient[])
        setDoctors([
          { id: "doc1", name: "Dr. Smith", role: "doctor", department: "Cardiology", email: "doc1@demo.com", phone: "9876543210", status: "active", joinDate: new Date(), opdAvailable: true },
          { id: "doc2", name: "Dr. Johnson", role: "doctor", department: "Neurology", email: "doc2@demo.com", phone: "9876543211", status: "active", joinDate: new Date(), opdAvailable: true },
        ] as Staff[])
        setLoading(false)
        return
      }

      try {
        // Fetch all patients
        const patientsRef = collection(db, "patients")
        const patientsSnapshot = await getDocs(patientsRef)
        setPatients(patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))

        // Fetch doctors from users collection
        const usersRef = collection(db, "users")
        const doctorsQuery = query(usersRef, where("role", "==", "doctor"))
        const doctorsSnapshot = await getDocs(doctorsQuery)
        const doctorsList = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff))
        
        // Use doctors with opdAvailable flag, or all if none have flag
        const opdDoctors = doctorsList.filter(doc => doc.opdAvailable === true)
        if (opdDoctors.length > 0) {
          setDoctors(opdDoctors)
        } else {
          setDoctors(doctorsList)
        }

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

    fetchData()
  }, [user])

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  )

  // Show all OPD available doctors
  const filteredDoctors = doctors

  const timeSlots = generateTimeSlots(9, 17, 30)
  const availableSlots = selectedDate && selectedDoctor
    ? timeSlots.filter(slot => isSlotAvailable(appointments, selectedDate, slot, selectedDoctor))
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive"
      })
      return
    }

    // Validate patient has UHID
    if (!selectedPatient.uhid) {
      toast({
        title: "Error",
        description: "Patient must have a valid UHID. Please contact admin.",
        variant: "destructive"
      })
      return
    }

    if (!selectedDoctor || !selectedDate || !selectedTimeSlot) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      })
      return
    }

    if (!symptoms.trim()) {
      toast({
        title: "Error",
        description: "Please enter symptoms or reason for visit",
        variant: "destructive"
      })
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
        description: `Appointment scheduled for ${selectedPatient.name} with Dr. ${doctor.name} on ${selectedDate.toLocaleDateString()} at ${formatTimeSlot(selectedTimeSlot)}. ${!db ? '(Demo Mode)' : ''}`,
      })

      // Reset form
      setSelectedPatient(null)
      setSelectedDoctor("")
      setSelectedTimeSlot("")
      setSymptoms("")
      setNotes("")
      setSearchTerm("")
      
    } catch (error) {
      console.error("Error booking appointment:", error)
      toast({
        title: "Booking Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddNewPatient = async () => {
    if (!newPatientData.name || !newPatientData.phone || !newPatientData.age) {
      toast({
        title: "Error",
        description: "Please fill all required fields (Name, Age, Phone)",
        variant: "destructive"
      })
      return
    }

    try {
      // Generate UHID
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
        setPatients([...patients, newPatient])
        setSelectedPatient(newPatient)
      } else {
        // Demo mode
        setPatients([...patients, newPatient])
        setSelectedPatient(newPatient)
      }

      toast({
        title: "Patient Added Successfully",
        description: `UHID: ${uhid} - ${newPatient.name}`,
      })

      setShowNewPatient(false)
      setNewPatientData({
        name: "",
        age: "",
        gender: "male",
        phone: "",
        email: "",
        address: ""
      })
    } catch (error) {
      console.error("Error adding patient:", error)
      toast({
        title: "Failed to Add Patient",
        description: "Please try again or contact support",
        variant: "destructive"
      })
    }
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

  return (
    <DashboardLayout role={role}>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Walk-in Appointment Booking</h1>
          <p className="text-muted-foreground">Book appointments for patients visiting the reception</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Selection */}
          <div className="lg:col-span-1">
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Patient
                </CardTitle>
                <CardDescription>Search existing or add new patient</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, UHID, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {selectedPatient ? (
                  <Card className="border-2 border-emerald-500">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <p className="font-semibold">{selectedPatient.name}</p>
                        <p className="text-sm text-muted-foreground">UHID: {selectedPatient.uhid}</p>
                        <p className="text-sm text-muted-foreground">Phone: {selectedPatient.phone}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPatient(null)}
                          className="w-full mt-2"
                        >
                          Change Patient
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {filteredPatients.map((patient) => (
                        <Card
                          key={patient.id}
                          className="cursor-pointer hover:border-emerald-500 transition-colors"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <CardContent className="pt-4">
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground">{patient.uhid}</p>
                            <p className="text-sm text-muted-foreground">{patient.phone}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowNewPatient(!showNewPatient)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New Patient
                    </Button>

                    {showNewPatient && (
                      <Card className="border-2 border-blue-500">
                        <CardContent className="pt-4 space-y-3">
                          <Input
                            placeholder="Full Name *"
                            value={newPatientData.name}
                            onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                          />
                          <Input
                            placeholder="Age *"
                            type="number"
                            value={newPatientData.age}
                            onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value })}
                          />
                          <Select
                            value={newPatientData.gender}
                            onValueChange={(value: any) => setNewPatientData({ ...newPatientData, gender: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Phone *"
                            value={newPatientData.phone}
                            onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                          />
                          <Input
                            placeholder="Email"
                            type="email"
                            value={newPatientData.email}
                            onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                          />
                          <Input
                            placeholder="Address"
                            value={newPatientData.address}
                            onChange={(e) => setNewPatientData({ ...newPatientData, address: e.target.value })}
                          />
                          <Button onClick={handleAddNewPatient} className="w-full">
                            Create Patient
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Appointment Form */}
          <div className="lg:col-span-2">
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Appointment Details
                </CardTitle>
                <CardDescription>Fill in appointment information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Selected Patient Info (Read-only) */}
                  {selectedPatient && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <Label className="text-sm text-muted-foreground">Patient Name</Label>
                        <p className="font-medium">{selectedPatient.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">UHID</Label>
                        <p className="font-medium font-mono">{selectedPatient.uhid}</p>
                      </div>
                    </div>
                  )}

                  {/* Doctor Selection - Show all OPD doctors */}
                  <div>
                    <Label htmlFor="doctor">Select Doctor *</Label>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor from any department" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredDoctors.length > 0 ? (
                          filteredDoctors.map(doctor => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              <div className="flex items-center gap-2">
                                <span>Dr. {doctor.name}</span>
                                {doctor.department && (
                                  <Badge variant="outline" className="text-xs">{doctor.department}</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-doctors" disabled>
                            No doctors available for OPD
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      All OPD available doctors from all departments
                    </p>
                  </div>

                  {/* Date Selection */}
                  <div>
                    <Label>Appointment Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                            weekday: 'short',
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 shadow-lg" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
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
                              "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
                              "h-9 w-9"
                            ),
                            day: cn(
                              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                            ),
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold",
                            day_today: "bg-accent text-accent-foreground font-semibold",
                            day_outside: "text-muted-foreground opacity-50",
                            day_disabled: "text-muted-foreground opacity-50 line-through",
                            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                            day_hidden: "invisible",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <Label>Time Slot *</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {availableSlots.length > 0 ? (
                        availableSlots.map(slot => (
                          <Button
                            key={slot}
                            type="button"
                            variant={selectedTimeSlot === slot ? "default" : "outline"}
                            onClick={() => setSelectedTimeSlot(slot)}
                            className="text-sm"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimeSlot(slot)}
                          </Button>
                        ))
                      ) : (
                        <p className="col-span-3 text-center text-muted-foreground py-4">
                          {selectedDoctor && selectedDate ? "No slots available for this date" : "Select doctor and date to see available slots"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Appointment Type */}
                  <div>
                    <Label>Appointment Type *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button
                        type="button"
                        variant={appointmentType === "consultation" ? "default" : "outline"}
                        onClick={() => setAppointmentType("consultation")}
                      >
                        New Consultation
                      </Button>
                      <Button
                        type="button"
                        variant={appointmentType === "follow-up" ? "default" : "outline"}
                        onClick={() => setAppointmentType("follow-up")}
                      >
                        Follow-up
                      </Button>
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div>
                    <Label htmlFor="symptoms">Symptoms / Reason for Visit *</Label>
                    <Textarea
                      id="symptoms"
                      placeholder="Describe symptoms or reason for visit (e.g., fever, headache, cough, pain, etc.)"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional information for the doctor"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!selectedPatient || submitting}
                  >
                    {submitting ? "Booking..." : "Confirm Appointment"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Appointment Summary */}
          <div className="space-y-6">
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPatient && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Patient</Label>
                    <p className="font-medium">{selectedPatient.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPatient.uhid}</p>
                  </div>
                )}
                
                {selectedDoctor && doctors.find(d => d.id === selectedDoctor) && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Doctor</Label>
                    <p className="font-medium">Dr. {doctors.find(d => d.id === selectedDoctor)?.name}</p>
                    <p className="text-sm text-muted-foreground">{doctors.find(d => d.id === selectedDoctor)?.department}</p>
                  </div>
                )}
                
                {selectedDate && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Date</Label>
                    <p className="font-medium">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
                
                {selectedTimeSlot && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Time</Label>
                    <p className="font-medium">{formatTimeSlot(selectedTimeSlot)}</p>
                  </div>
                )}
                
                {appointmentType && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Type</Label>
                    <Badge variant="outline">{appointmentType}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Important Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Patient should arrive 10 minutes before appointment</p>
                <p>• Collect consultation fee at reception</p>
                <p>• Provide queue number token to patient</p>
                <p>• Update patient records if needed</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
