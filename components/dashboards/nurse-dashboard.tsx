"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Users, FileText, Clock, AlertCircle, Plus, Bell } from "lucide-react"
import { mockPatients } from "@/lib/mock-data"
import { useState } from "react"

export default function NurseDashboard() {
  const [newNote, setNewNote] = useState("")
  const assignedPatients = mockPatients // In real app, filter by assigned nurse
  const criticalPatients = assignedPatients.filter((p) => p.status === "critical")

  const medicineReminders = [
    { patientName: "John Smith", medicine: "Lisinopril 10mg", time: "10:00 AM", status: "pending" },
    { patientName: "Emily Davis", medicine: "Azithromycin 250mg", time: "2:00 PM", status: "completed" },
    { patientName: "Robert Wilson", medicine: "Metoprolol 25mg", time: "6:00 PM", status: "pending" },
  ]

  const handleAddNote = (patientId: string) => {
    if (newNote.trim()) {
      // In real app, save to database
      console.log(`Adding note for patient ${patientId}: ${newNote}`)
      setNewNote("")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nurse Dashboard</h1>
        <p className="text-gray-600">Patient care and nursing management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedPatients.length}</div>
            <p className="text-xs text-muted-foreground">Under your care</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Patients</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalPatients.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medicine Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicineReminders.filter((r) => r.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Pending today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notes Added</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">This shift</p>
          </CardContent>
        </Card>
      </div>

      {/* Medicine Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Medicine Reminders
          </CardTitle>
          <CardDescription>Scheduled medication times for your patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {medicineReminders.map((reminder, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{reminder.patientName}</p>
                  <p className="text-sm text-gray-600">{reminder.medicine}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{reminder.time}</p>
                  <Badge variant={reminder.status === "completed" ? "default" : "secondary"}>{reminder.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <Card>
        <CardHeader>
          <CardTitle>My Patients</CardTitle>
          <CardDescription>Patients assigned to your care</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignedPatients.map((patient) => (
              <div key={patient.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{patient.name}</h3>
                    <p className="text-sm text-gray-600">{patient.diagnosis}</p>
                    <p className="text-sm text-gray-500">
                      Age: {patient.age} • Bed: {patient.assignedBed}
                    </p>
                  </div>
                  <Badge
                    variant={
                      patient.status === "critical"
                        ? "destructive"
                        : patient.status === "admitted"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {patient.status}
                  </Badge>
                </div>

                {/* Vitals */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 p-3 bg-gray-50 rounded">
                  <div>
                    <p className="text-xs text-gray-500">Blood Pressure</p>
                    <p className="font-medium">{patient.vitals.bloodPressure}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Heart Rate</p>
                    <p className="font-medium">{patient.vitals.heartRate} bpm</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="font-medium">{patient.vitals.temperature}°F</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">O2 Saturation</p>
                    <p className="font-medium">{patient.vitals.oxygenSaturation}%</p>
                  </div>
                </div>

                {/* Nursing Notes */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Nursing Notes</h4>
                  {patient.nursingNotes && patient.nursingNotes.length > 0 ? (
                    <div className="space-y-1">
                      {patient.nursingNotes.map((note, index) => (
                        <p key={index} className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                          {note}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No notes yet</p>
                  )}

                  <div className="flex space-x-2">
                    <Textarea
                      placeholder="Add nursing note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button onClick={() => handleAddNote(patient.id)} disabled={!newNote.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common nursing tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col bg-transparent">
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
