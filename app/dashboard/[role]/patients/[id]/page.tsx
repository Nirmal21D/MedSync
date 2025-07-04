"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Activity, FileText, Brain, Pill, AlertTriangle } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Patient, NursingNote } from "@/lib/types"
import AIPatientInsights from "@/components/ai/ai-patient-insights"
import AIMedicationChecker from "@/components/ai/ai-medication-checker"

export default function AIPatientDetails() {
  const params = useParams()
  const patientId = params.id as string
  
  const [patient, setPatient] = useState<Patient | null>(null)
  const [nursingNotes, setNursingNotes] = useState<NursingNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!db || !patientId) return

      try {
        // Fetch patient
        const patientsSnapshot = await getDocs(collection(db, "patients"))
        const foundPatient = patientsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Patient))
          .find(p => p.id === patientId)
        
        if (foundPatient) {
          setPatient(foundPatient)
        }

        // Fetch nursing notes
        const notesQuery = query(
          collection(db, "nursingNotes"),
          where("patientId", "==", patientId)
        )
        const notesSnapshot = await getDocs(notesQuery)
        const notes = notesSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as NursingNote))
        
        setNursingNotes(notes.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ))

      } catch (error) {
        console.error("Error fetching patient data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPatientData()
  }, [patientId])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center p-6">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">Patient Not Found</h3>
            <p className="text-gray-500">The requested patient could not be found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Patient Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center">
            <User className="mr-3 h-8 w-8" />
            {patient.name}
          </h1>
          <Badge variant={patient.status === 'critical' ? 'destructive' : 'secondary'}>
            {patient.status}
          </Badge>
        </div>
        <p className="text-gray-600">
          {patient.age} years old • {patient.gender} • {patient.diagnosis}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="medication">Medications</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{patient.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assigned Doctor</p>
                    <p className="font-medium">{patient.assignedDoctor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bed</p>
                    <p className="font-medium">{patient.assignedBed || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">{patient.address}</p>
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Current Vitals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded">
                    <p className="text-2xl font-bold">{patient.vitals.bloodPressure}</p>
                    <p className="text-sm text-gray-600">Blood Pressure</p>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <p className="text-2xl font-bold">{patient.vitals.heartRate}</p>
                    <p className="text-sm text-gray-600">Heart Rate</p>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <p className="text-2xl font-bold">{patient.vitals.temperature}°F</p>
                    <p className="text-sm text-gray-600">Temperature</p>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <p className="text-2xl font-bold">{patient.vitals.oxygenSaturation}%</p>
                    <p className="text-sm text-gray-600">Oxygen Sat</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          <AIPatientInsights 
            patient={patient} 
            nursingNotes={nursingNotes}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="medication" className="space-y-6">
          <AIMedicationChecker 
            patient={patient}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Nursing Notes ({nursingNotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nursingNotes.length === 0 ? (
                <p className="text-center text-gray-500 py-6">No nursing notes available</p>
              ) : (
                <div className="space-y-4">
                  {nursingNotes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={note.priority === 'high' ? 'destructive' : 'secondary'}>
                            {note.priority}
                          </Badge>
                          <Badge variant="outline">{note.type}</Badge>
                          <Badge variant="outline">{note.shift}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(note.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm font-medium mb-1">By: {note.nurseName}</p>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
