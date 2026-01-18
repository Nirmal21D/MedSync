"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, Mic, Clock, User, Phone } from "lucide-react"
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

export default function AppointmentBookingPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [patientData, setPatientData] = useState<Patient | null>(null)
  const [doctors, setDoctors] = useState<Staff[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form state
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("")
  const [appointmentType, setAppointmentType] = useState<"consultation" | "follow-up">("consultation")
  const [symptoms, setSymptoms] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      // Demo mode - no Firebase
      if (!db) {
        setPatientData({
          id: "demo-patient-1",
          uhid: "UHID-202601-00001",
          name: user.name || "Demo Patient",
          age: 30,
          gender: "male",
          phone: "9876543210",
          email: user.email || "patient@gmail.com",
          address: "Demo Address, City",
          status: "stable",
          medicalHistory: []
        } as Patient)
        
        // Demo doctors
        setDoctors([
          { id: "doc1", name: "Dr. Smith", role: "doctor", department: "Cardiology", email: "doc1@demo.com", phone: "9876543210", status: "active", joinDate: new Date(), opdAvailable: true },
          { id: "doc2", name: "Dr. Johnson", role: "doctor", department: "Neurology", email: "doc2@demo.com", phone: "9876543211", status: "active", joinDate: new Date(), opdAvailable: true },
          { id: "doc3", name: "Dr. Williams", role: "doctor", department: "Orthopedics", email: "doc3@demo.com", phone: "9876543212", status: "active", joinDate: new Date(), opdAvailable: true },
        ] as Staff[])
        
        setLoading(false)
        return
      }

      try {
        // Fetch patient data
        const patientsRef = collection(db, "patients")
        const patientsQuery = query(patientsRef, where("email", "==", user.email))
        const patientsSnapshot = await getDocs(patientsQuery)
        
        if (!patientsSnapshot.empty) {
          const patient = { id: patientsSnapshot.docs[0].id, ...patientsSnapshot.docs[0].data() } as Patient
          setPatientData(patient)
        } else {
          // Create demo patient
          setPatientData({
            id: "demo-patient-1",
            uhid: "UHID-202601-00001",
            name: user.name || "Demo Patient",
            age: 30,
            gender: "male",
            phone: "9876543210",
            email: user.email || "patient@gmail.com",
            address: "Demo Address, City",
            status: "stable",
            medicalHistory: []
          } as Patient)
        }

        // Fetch doctors
        const usersRef = collection(db, "users")
        const doctorsQuery = query(usersRef, where("role", "==", "doctor"))
        const doctorsSnapshot = await getDocs(doctorsQuery)
        const doctorsList = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff))
        
        // Filter only OPD-available doctors
        const opdDoctors = doctorsList.filter(doc => doc.opdAvailable === true)
        
        // Add demo doctors if none found
        if (opdDoctors.length === 0) {
          setDoctors([
            { id: "doc1", name: "Dr. Smith", role: "doctor", department: "Cardiology", email: "doc1@demo.com", phone: "9876543210", status: "active", joinDate: new Date(), opdAvailable: true },
            { id: "doc2", name: "Dr. Johnson", role: "doctor", department: "Neurology", email: "doc2@demo.com", phone: "9876543211", status: "active", joinDate: new Date(), opdAvailable: true },
            { id: "doc3", name: "Dr. Williams", role: "doctor", department: "Orthopedics", email: "doc3@demo.com", phone: "9876543212", status: "active", joinDate: new Date(), opdAvailable: true },
          ] as Staff[])
        } else {
          setDoctors(opdDoctors)
        }

        // Fetch all appointments for availability check
        const appointmentsRef = collection(db, "appointments")
        const aptSnapshot = await getDocs(appointmentsRef)
        setAppointments(aptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)))
        
      } catch (error) {
        console.error("Error fetching data:", error)
        // Fallback to demo data
        setPatientData({
          id: "demo-patient-1",
          uhid: "UHID-202601-00001",
          name: user.name || "Demo Patient",
          age: 30,
          gender: "male",
          phone: "9876543210",
          email: user.email || "patient@gmail.com",
          address: "Demo Address, City",
          status: "stable",
          medicalHistory: []
        } as Patient)
        setDoctors([
          { id: "doc1", name: "Dr. Smith", role: "doctor", department: "Cardiology", email: "doc1@demo.com", phone: "9876543210", status: "active", joinDate: new Date(), opdAvailable: true },
          { id: "doc2", name: "Dr. Johnson", role: "doctor", department: "Neurology", email: "doc2@demo.com", phone: "9876543211", status: "active", joinDate: new Date(), opdAvailable: true },
          { id: "doc3", name: "Dr. Williams", role: "doctor", department: "Orthopedics", email: "doc3@demo.com", phone: "9876543212", status: "active", joinDate: new Date(), opdAvailable: true },
        ] as Staff[])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Show all OPD available doctors
  const filteredDoctors = doctors

  const timeSlots = generateTimeSlots(9, 17, 30)
  const availableSlots = selectedDate && selectedDoctor
    ? timeSlots.filter(slot => isSlotAvailable(appointments, selectedDate, slot, selectedDoctor))
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!patientData || !selectedDoctor || !selectedDate || !selectedTimeSlot) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields",
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
        uhid: patientData.uhid,
        patientId: patientData.id,
        patientName: patientData.name,
        patientPhone: patientData.phone,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: doctor.department,
        appointmentDate: selectedDate,
        timeSlot: selectedTimeSlot,
        type: appointmentType,
        status: "scheduled",
        reason: symptoms,
        notes,
        createdAt: new Date(),
        createdBy: user?.uid || "patient",
        queueNumber: getNextQueueNumber(appointments, selectedDate),
        voiceBooked: false
      }

      if (db) {
        await setDoc(doc(db, "appointments", appointment.id), appointment)
      }
      
      toast({
        title: "Appointment Booked!",
        description: `Your appointment with Dr. ${doctor.name} is confirmed for ${selectedDate.toLocaleDateString()} at ${formatTimeSlot(selectedTimeSlot)}. ${!db ? '(Demo Mode)' : ''}`,
      })

      // Small delay for toast to show
      setTimeout(() => {
        router.push("/dashboard/patient/appointments")
      }, 1000)
    } catch (error) {
      console.error("Error booking appointment:", error)
      toast({
        title: "Booking Failed",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVoiceBooking = () => {
    router.push('/dashboard/patient/voice-booking')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!patientData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center p-6">
            <p className="text-gray-500">Patient profile not found. Please contact reception.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Book Appointment</h1>
          <p className="text-muted-foreground">Schedule your consultation with a doctor</p>
        </div>
        <Button onClick={handleVoiceBooking} variant="outline" className="gap-2">
          <Mic className="h-4 w-4" />
          Voice Booking
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Form */}
        <Card className="lg:col-span-2 glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
            <CardDescription>Fill in the information to book your appointment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Info (Read-only) */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm text-muted-foreground">Patient Name</Label>
                  <p className="font-medium">{patientData.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">UHID</Label>
                  <p className="font-medium font-mono">{patientData.uhid}</p>
                </div>
              </div>

              {/* Doctor Selection - Show all OPD doctors */}
              {/* Department Selection removed - showing all available doctors */}
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
                <Label htmlFor="symptoms">Symptoms *</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Describe your symptoms (e.g., fever, headache, cough, pain, etc.)"
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Booking..." : "Confirm Appointment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Appointment Summary */}
        <div className="space-y-6">
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <p>• Please arrive 10 minutes before your appointment</p>
              <p>• Bring your UHID card and any relevant medical records</p>
              <p>• Consultation fee will be collected at the time of visit</p>
              <p>• Cancellations must be made 24 hours in advance</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
