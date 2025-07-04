"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
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
import { FileText, Plus, Search, Clock, User, Tag, AlertCircle, CheckCircle } from "lucide-react"
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { NursingNote, Patient } from "@/lib/types"

function formatDate(date: Date | string | number | { seconds: number, nanoseconds: number } | undefined): string {
  if (!date) return "No Date"
  
  try {
    let dateObj: Date
    
    if (date instanceof Date) {
      dateObj = date
    } else if (typeof date === 'string') {
      dateObj = new Date(date)
    } else if (typeof date === 'number') {
      dateObj = new Date(date)
    } else if (date && 'seconds' in date) {
      // Firestore Timestamp handling
      dateObj = new Date(date.seconds * 1000)
    } else {
      return "Invalid Date"
    }
    
    return dateObj.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata' // Explicitly set to Indian time zone
    })
  } catch (error) {
    console.error("Date formatting error:", error)
    return "Invalid Date"
  }
}

export default function NursingNotesPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const [notes, setNotes] = useState<NursingNote[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [shiftFilter, setShiftFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [showAddNote, setShowAddNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editFormData, setEditFormData] = useState({
    patientName: "",
    shift: "",
    type: "",
    content: "",
    priority: "",
    tags: "",
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db) {
      getDocs(collection(db, "nursingNotes")).then(snapshot => {
        setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NursingNote)))
      })
      getDocs(collection(db, "patients")).then(snapshot => {
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))
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

  const getFilteredNotes = () => {
    let filtered = notes

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (note) =>
          note.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.nurseName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Shift filtering
    if (shiftFilter !== "all") {
      filtered = filtered.filter((note) => note.shift === shiftFilter)
    }

    // Type filtering
    if (typeFilter !== "all") {
      filtered = filtered.filter((note) => note.type === typeFilter)
    }

    // Priority filtering
    if (priorityFilter !== "all") {
      filtered = filtered.filter((note) => note.priority === priorityFilter)
    }

    if (role === "nurse") {
      filtered = filtered.filter((note) => note.nurseName === user?.name)
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const filteredNotes = getFilteredNotes()

  const handleAddNote = async (newNote: Partial<NursingNote>) => {
    if (!db) return

    if (editingNoteId) {
      // Edit existing note
      await setDoc(doc(db, "nursingNotes", editingNoteId), {
        ...notes.find(n => n.id === editingNoteId),
        ...newNote,
        timestamp: new Date(), // Optionally update timestamp
      })
      setNotes(notes.map(n => n.id === editingNoteId ? { ...n, ...newNote, timestamp: new Date() } : n))
      setEditingNoteId(null)
      setEditContent("")
      setEditFormData({
        patientName: "",
        shift: "",
        type: "",
        content: "",
        priority: "",
        tags: "",
      })
      setShowAddNote(false)
      return
    }

    // Add new note
    const note: NursingNote = {
      id: String(Date.now()),
      patientId: newNote.patientId || "",
      patientName: newNote.patientName || "",
      nurseId: user?.uid || "",
      nurseName: user?.name || user?.displayName || "",
      shift: (newNote.shift as "morning" | "afternoon" | "night") || "morning",
      type: (newNote.type as "general" | "medication" | "vitals" | "observation" | "handover") || "general",
      content: newNote.content || "",
      timestamp: new Date(),
      priority: (newNote.priority as "low" | "medium" | "high") || "medium",
      tags: newNote.tags || [],
    }
    await setDoc(doc(db, "nursingNotes", note.id), note)
    setNotes([note, ...notes])
    setShowAddNote(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "medication":
        return "💊"
      case "vitals":
        return "📊"
      case "observation":
        return "👁️"
      case "handover":
        return "🔄"
      default:
        return "📝"
    }
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nursing Notes</h1>
            <p className="text-gray-600 dark:text-gray-300">Patient care documentation and shift notes</p>
          </div>
          <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Nursing Note</DialogTitle>
                <DialogDescription>Document patient care or observations</DialogDescription>
              </DialogHeader>
              <AddNoteForm
                onSubmit={handleAddNote}
                onCancel={() => {
                  setShowAddNote(false)
                  setEditingNoteId(null)
                  setEditContent("")
                  setEditFormData({
                    patientName: "",
                    shift: "",
                    type: "",
                    content: "",
                    priority: "",
                    tags: "",
                  })
                }}
                patients={patients as Patient[]}
                editContent={editContent}
                setEditContent={setEditContent}
                editingNoteId={editingNoteId}
                editFormData={editFormData}
                setEditFormData={setEditFormData}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notes by patient, content, or nurse..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="vitals">Vitals</SelectItem>
                  <SelectItem value="observation">Observation</SelectItem>
                  <SelectItem value="handover">Handover</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notes Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Notes</p>
                  <p className="text-2xl font-bold">{filteredNotes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">High Priority</p>
                  <p className="text-2xl font-bold">{filteredNotes.filter((n) => n.priority === "high").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Today's Notes</p>
                  <p className="text-2xl font-bold">
                    {
                      filteredNotes.filter((n) => new Date(n.timestamp).toDateString() === new Date().toDateString())
                        .length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">My Notes</p>
                  <p className="text-2xl font-bold">
                    {filteredNotes.filter((n) => n.nurseName === "Current Nurse").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.map((note) => {
            const canEdit =
              note.nurseId === user?.uid &&
              (Date.now() - new Date(note.timestamp).getTime()) < 10 * 60 * 1000 // 10 minutes

            return (
              <Card key={note.id} className="hover:shadow-md transition-shadow glass-card bg-card backdrop-blur-xl shadow-lg border border-gray-200 dark:border-gray-800 rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">{getTypeIcon(note.type)}</span>
                        <h3 className="text-lg font-semibold">{note.patientName}</h3>
                        <Badge variant={getPriorityColor(note.priority)} className="capitalize">
                          {note.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {note.type}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {note.shift}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="mr-2 h-4 w-4" />
                          {note.nurseName}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="mr-2 h-4 w-4" />
                          {formatDate(note.timestamp)}
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Tag className="mr-2 h-4 w-4" />
                            {note.tags.join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded-lg">
                        <p>{note.content}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNoteId(note.id)
                          setEditContent(note.content)
                          setShowAddNote(true)
                          setEditFormData({
                            patientName: note.patientName,
                            shift: note.shift,
                            type: note.type,
                            content: note.content,
                            priority: note.priority,
                            tags: (note.tags || []).join(", "),
                          })
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (!db) return
                        await deleteDoc(doc(db, "nursingNotes", note.id))
                        setNotes(notes.filter(n => n.id !== note.id))
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredNotes.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No nursing notes found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

function AddNoteForm({
  onSubmit,
  onCancel,
  patients,
  editContent,
  setEditContent,
  editingNoteId,
  editFormData,
  setEditFormData,
}: {
  onSubmit: (note: Partial<NursingNote>) => void
  onCancel: () => void
  patients: Patient[]
  editContent: string
  setEditContent: React.Dispatch<React.SetStateAction<string>>
  editingNoteId: string | null
  editFormData: any
  setEditFormData: React.Dispatch<React.SetStateAction<any>>
}) {
  const [formData, setFormData] = useState({
    patientName: "",
    shift: "",
    type: "",
    content: "",
    priority: "",
    tags: "",
  })

  useEffect(() => {
    if (editingNoteId) {
      setFormData(editFormData)
    }
  }, [editingNoteId, editFormData])

  const handleChange = (field: string, value: string) => {
    if (editingNoteId) {
      setEditFormData((prev: any) => ({ ...prev, [field]: value }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = editingNoteId ? editFormData : formData
    onSubmit({
      ...data,
      shift: data.shift as "morning" | "afternoon" | "night",
      type: data.type as "general" | "medication" | "vitals" | "observation" | "handover",
      priority: data.priority as "low" | "medium" | "high",
      tags: data.tags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter(Boolean),
    })
  }

  const data = editingNoteId ? editFormData : formData

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="patientName">Patient *</Label>
          <Select
            value={data.patientName}
            onValueChange={(value) => handleChange("patientName", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient: Patient) => (
                <SelectItem key={patient.id} value={patient.name}>
                  {patient.name} - {patient.diagnosis}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shift">Shift *</Label>
          <Select value={data.shift} onValueChange={(value) => handleChange("shift", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
              <SelectItem value="night">Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Note Type *</Label>
          <Select value={data.type} onValueChange={(value) => handleChange("type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="medication">Medication</SelectItem>
              <SelectItem value="vitals">Vitals</SelectItem>
              <SelectItem value="observation">Observation</SelectItem>
              <SelectItem value="handover">Handover</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority *</Label>
          <Select value={data.priority} onValueChange={(value) => handleChange("priority", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Note Content *</Label>
        <Textarea
          id="content"
          value={data.content}
          onChange={(e) => handleChange("content", e.target.value)}
          rows={4}
          placeholder="Enter detailed nursing note..."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={data.tags}
          onChange={(e) => handleChange("tags", e.target.value)}
          placeholder="e.g., medication, vitals, fever"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{editingNoteId ? "Save Changes" : "Add Note"}</Button>
      </div>
    </form>
  )
}
