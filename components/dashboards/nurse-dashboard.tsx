"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Users, FileText, Clock, AlertCircle, Plus, Bell, Brain } from "lucide-react"
import { collection, getDocs, setDoc, doc, updateDoc, arrayUnion } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import type { Patient, NursingNote, MedicineReminder } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Firestore } from "firebase/firestore"
import AIQuickInsights from "@/components/ai/ai-quick-insights"
import AIPatientInsights from "@/components/ai/ai-patient-insights"

export default function NurseDashboard() {
  const { user } = useAuth()
  const [newNote, setNewNote] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [criticalPatients, setCriticalPatients] = useState<Patient[]>([])
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [activeReminders, setActiveReminders] = useState<MedicineReminder[]>([])

  useEffect(() => {
    if (!db || !user) return

    // Fetch patients
    const fetchPatients = async () => {
      try {
        const snapshot = await getDocs(collection(db as Firestore, "patients"))
        const allPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient))
        setPatients(allPatients)
        setCriticalPatients(allPatients.filter((p) => p.status === "critical"))
      } catch (error) {
        console.error("Error fetching patients:", error)
      }
    }

    // Fetch medicine reminders for the current nurse/shift
    const fetchMedicineReminders = async () => {
      try {
        const remindersRef = collection(db as Firestore, "medicineReminders")
        const snapshot = await getDocs(remindersRef)
        const reminders = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as MedicineReminder))
          .filter(reminder => 
            reminder.status === "active" && 
            new Date(reminder.startDate) <= new Date() && 
            (!reminder.endDate || new Date(reminder.endDate) >= new Date())
          )
        setActiveReminders(reminders)
      } catch (error) {
        console.error("Error fetching reminders:", error)
      }
    }

    fetchPatients()
    fetchMedicineReminders()
  }, [user])

  // Update reminder status
  const handleReminderStatusUpdate = async (reminderId: string, newStatus: 'active' | 'completed' | 'paused') => {
    if (!db) return

    try {
      const reminderRef = doc(db as Firestore, "medicineReminders", reminderId)
      await updateDoc(reminderRef, { status: newStatus })

      // Update local state
      setActiveReminders(prevReminders => 
        prevReminders.map(reminder => 
          reminder.id === reminderId 
            ? { ...reminder, status: newStatus } 
            : reminder
        )
      )
    } catch (error) {
      console.error("Error updating reminder status:", error)
    }
  }

  // Example: medicine reminders (replace with real data if available)
  const medicineRemindersExample = [
    { patientName: "John Smith", medicine: "Lisinopril 10mg", time: "10:00 AM", status: "pending" },
    { patientName: "Emily Davis", medicine: "Azithromycin 250mg", time: "2:00 PM", status: "completed" },
    { patientName: "Robert Wilson", medicine: "Metoprolol 25mg", time: "6:00 PM", status: "pending" },
  ]

  // Add a nursing note for a patient
  const handleAddNote = async () => {
    if (!db || !selectedPatient || !user || !newNote.trim()) return

    // 1. Add note to patient's notes array
    await updateDoc(doc(db, "patients", selectedPatient.id), {
      notes: arrayUnion({
        content: newNote,
        nurseName: user.name,
        timestamp: new Date().toISOString(),
      }),
    })

    // 2. Add note to nursingNotes collection
    const note: NursingNote = {
      id: String(Date.now()),
      patientId: selectedPatient.id,
      patientName: selectedPatient.name ?? "",
      nurseId: user.uid ?? "",
      nurseName: user.name ?? "",
      shift: "morning", // You can make this dynamic
      type: "general",
      content: newNote,
      timestamp: new Date(),
      priority: "medium",
      tags: [],
    }
    await setDoc(doc(db, "nursingNotes", note.id), note)

    setNewNote("")
    setShowNoteDialog(false)
  }

  // Example chart data (replace with real patient vitals history if available)
  const getChartData = (patient: Patient) => [
    { name: "BP", value: parseInt((patient.vitals?.bloodPressure || "120/80").split("/")[0]) || 120 },
    { name: "HR", value: patient.vitals?.heartRate || 72 },
    { name: "Temp", value: patient.vitals?.temperature || 98.6 },
    { name: "O2", value: patient.vitals?.oxygenSaturation || 98 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Nurse Dashboard</h1>
        <p className="text-muted-foreground dark:text-gray-300">Patient care and nursing management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Patients</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><Users className="h-4 w-4 text-blue-600 dark:text-blue-300" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{patients.length}</div>
            <p className="text-xs text-muted-foreground">All patients</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Critical Patients</CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg"><AlertCircle className="h-4 w-4 text-red-600 dark:text-red-300" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-300">{criticalPatients.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Medicine Reminders</CardTitle>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg"><Bell className="h-4 w-4 text-yellow-600 dark:text-yellow-300" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeReminders.length}</div>
            <p className="text-xs text-muted-foreground">Active Reminders</p>
          </CardContent>
        </Card>
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Notes Added</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><FileText className="h-4 w-4 text-purple-600 dark:text-purple-300" /></div>
          </CardHeader>
          <CardContent>
            {/* You can fetch and count notes for this nurse if needed */}
            <div className="text-2xl font-bold text-foreground">-</div>
            <p className="text-xs text-muted-foreground">This shift</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Quick Insights */}
      <AIQuickInsights patients={patients} />

      {/* Medicine Reminders - Enhanced Version */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <Bell className="mr-2 h-5 w-5" />
            Medicine Reminders
          </CardTitle>
          <CardDescription className="text-muted-foreground">Scheduled medication times for your patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeReminders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                No active medicine reminders at the moment
              </p>
            ) : (
              activeReminders.map((reminder) => (
                <div 
                  key={reminder.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{reminder.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {reminder.medicineName} - {reminder.dosage}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {reminder.frequency} | {reminder.timeOfDay.join(", ")}
                    </p>
                  </div>
                  <div className="text-right flex items-center space-x-2">
                    <Badge 
                      variant={
                        reminder.status === "completed" 
                          ? "default" 
                          : reminder.status === "paused" 
                            ? "secondary" 
                            : "outline"
                      }
                    >
                      {reminder.status}
                    </Badge>
                    {reminder.status === "active" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReminderStatusUpdate(reminder.id, "completed")}
                      >
                        Mark as Done
                      </Button>
                    )}
                    {reminder.status === "active" && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReminderStatusUpdate(reminder.id, "paused")}
                      >
                        Pause
                      </Button>
                    )}
                  </div>
                </div>
              )))
            }
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground">All Patients</CardTitle>
          <CardDescription className="text-muted-foreground">All patients under your care</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patients.map((patient) => {
              const notes = (patient as any).notes as any[] | undefined;
              const safeNotes = notes ?? [];
              return (
                <Card key={patient.id} className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{patient.name}</h3>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>{patient.diagnosis}</span>
                          <span>Age: {patient.age}</span>
                          <span>Bed: {patient.assignedBed}</span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          patient.status === "critical"
                            ? "destructive"
                            : patient.status === "admitted"
                            ? "default"
                            : "secondary"
                        }
                        className="text-base px-4 py-1"
                      >
                        {patient.status}
                      </Badge>
                    </div>
                    {/* Chart */}
                    <div className="mb-3">
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={getChartData(patient)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Latest Nursing Note */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">Latest Nursing Note</h4>
                      {safeNotes.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm bg-blue-50 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100 p-3 rounded-lg flex-1">
                              {safeNotes[safeNotes.length - 1].content}
                              <span className="text-xs text-gray-400 ml-2">- {safeNotes[safeNotes.length - 1].nurseName}</span>
                              <span className="text-xs text-gray-400 ml-2">{new Date(safeNotes[safeNotes.length - 1].timestamp).toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No notes yet</p>
                      )}
                      <p className="text-xs text-blue-600 mt-2">For full note management, visit the Nursing Notes section.</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
          <CardDescription className="text-muted-foreground">Common nursing tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col bg-transparent"
              onClick={() => {
                if (patients.length > 0) {
                  setSelectedPatient(patients[0])
                  setShowNoteDialog(true)
                }
              }}
            >
              <FileText className="h-6 w-6 mb-2" />
              Add Note
            </Button>
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <Bell className="h-6 w-6 mb-2" />
              Set Reminder
            </Button>
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <Users className="h-6 w-6 mb-2" />
              Patient Rounds
            </Button>
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <Clock className="h-6 w-6 mb-2" />
              Shift Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
