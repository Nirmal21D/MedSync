"use client"

import * as React from "react"

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
import { Calendar, Clock, Plus, Search, User, FileText, CheckCircle, X } from "lucide-react"
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Appointment } from "@/lib/types"

export default function AppointmentsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [showAddAppointment, setShowAddAppointment] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user) {
      getDocs(collection(db, "appointments")).then(snapshot => {
        setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Appointment))
      })
      getDocs(collection(db, "patients")).then(snapshot => {
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      })
      getDocs(collection(db, "users")).then(snapshot => {
        setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
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

  const getFilteredAppointments = () => {
    let filtered = appointments

    // Role-based filtering
    if (role === "doctor") {
      filtered = appointments.filter((a) => a.doctorName === "Dr. Sarah Johnson")
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.type.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter)
    }

    // Date filtering
    if (dateFilter !== "all") {
      const today = new Date()
      const appointmentDate = new Date()

      switch (dateFilter) {
        case "today":
          filtered = filtered.filter((a) => new Date(a.date).toDateString() === today.toDateString())
          break
        case "week":
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          filtered = filtered.filter((a) => new Date(a.date) >= today && new Date(a.date) <= weekFromNow)
          break
        case "month":
          filtered = filtered.filter(
            (a) =>
              new Date(a.date).getMonth() === today.getMonth() &&
              new Date(a.date).getFullYear() === today.getFullYear(),
          )
          break
      }
    }

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const filteredAppointments = getFilteredAppointments()

  const handleAddAppointment = async (newAppointment: Partial<Appointment>) => {
    if (!db) return
    const appointment: Omit<Appointment, "id"> = {
      patientId: newAppointment.patientId || "",
      patientName: newAppointment.patientName || "",
      doctorId: newAppointment.doctorId || "",
      doctorName: newAppointment.doctorName || "",
      date: newAppointment.date || new Date(),
      time: newAppointment.time || "",
      type: (newAppointment.type as "consultation" | "follow-up" | "emergency") || "consultation",
      status: "scheduled",
      notes: newAppointment.notes,
    }
    const docRef = await addDoc(collection(db, "appointments"), appointment)
    setAppointments([...appointments, { ...appointment, id: docRef.id }])
    setShowAddAppointment(false)
  }

  const handleStatusChange = async (appointmentId: string, newStatus: "scheduled" | "completed" | "cancelled") => {
    if (!db) return
    await updateDoc(doc(db, "appointments", appointmentId), { status: newStatus })
    setAppointments(appointments.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a)))
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {role === "doctor" ? "My Appointments" : "Appointment Management"}
            </h1>
            <p className="text-gray-600">
              {role === "doctor" ? "Your scheduled appointments" : "Manage hospital appointments"}
            </p>
          </div>
          <Dialog open={showAddAppointment} onOpenChange={setShowAddAppointment}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Appointment</DialogTitle>
                <DialogDescription>Book an appointment for a patient</DialogDescription>
              </DialogHeader>
              <AddAppointmentForm onSubmit={handleAddAppointment} onCancel={() => setShowAddAppointment(false)} patients={patients} staff={staff} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search appointments by patient, doctor, or type..."
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
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{filteredAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold">
                    {filteredAppointments.filter((a) => a.status === "scheduled").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">
                    {filteredAppointments.filter((a) => a.status === "completed").length}
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
                  <p className="text-sm font-medium text-gray-600">Cancelled</p>
                  <p className="text-2xl font-bold">
                    {filteredAppointments.filter((a) => a.status === "cancelled").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{appointment.patientName}</h3>
                      <Badge
                        variant={
                          appointment.status === "scheduled"
                            ? "default"
                            : appointment.status === "completed"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {appointment.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {appointment.type}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="mr-2 h-4 w-4" />
                        {appointment.doctorName}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="mr-2 h-4 w-4" />
                        {new Date(appointment.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="mr-2 h-4 w-4" />
                        {appointment.time}
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">
                          <FileText className="inline mr-1 h-3 w-3" />
                          {appointment.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {appointment.status === "scheduled" && (
                      <>
                        <Button size="sm" onClick={() => handleStatusChange(appointment.id, "completed")}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(appointment.id, "cancelled")}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    )}
                    {appointment.status === "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(appointment.id, "scheduled")}
                      >
                        Reschedule
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAppointments.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

type AddAppointmentFormProps = {
  onSubmit: (appointment: Partial<Appointment>) => void;
  onCancel: () => void;
  patients: any[];
  staff: any[];
}

function AddAppointmentForm({ onSubmit, onCancel, patients, staff }: AddAppointmentFormProps) {
  const [formData, setFormData] = useState({
    patientName: "",
    doctorName: "",
    date: "",
    time: "",
    type: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      date: new Date(formData.date),
      type: (formData.type as "consultation" | "follow-up" | "emergency") || "consultation",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patientName">Patient Name *</Label>
          <Select
            value={formData.patientName}
            onValueChange={(value) => setFormData({ ...formData, patientName: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.name}>
                  {patient.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doctorName">Doctor *</Label>
          <Select
            value={formData.doctorName}
            onValueChange={(value) => setFormData({ ...formData, doctorName: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {staff
                .filter((s) => s.role === "doctor")
                .map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.name}>
                    {doctor.name} - {doctor.specialization}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Time *</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Appointment Type *</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consultation">Consultation</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Additional notes or instructions..."
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Schedule Appointment</Button>
      </div>
    </form>
  )
}
