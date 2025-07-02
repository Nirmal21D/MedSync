"use client"

import type React from "react"
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
import { FileText, Plus, Search, Clock, User, Tag, AlertCircle, CheckCircle } from "lucide-react"
import { mockNursingNotes, mockPatients, type NursingNote } from "@/lib/mock-data"

export default function NursingNotesPage({ params }: { params: { role: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = params
  const [notes, setNotes] = useState<NursingNote[]>(mockNursingNotes)
  const [searchTerm, setSearchTerm] = useState("")
  const [shiftFilter, setShiftFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [showAddNote, setShowAddNote] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
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

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const filteredNotes = getFilteredNotes()

  const handleAddNote = (newNote: Partial<NursingNote>) => {
    const note: NursingNote = {
      id: (notes.length + 1).toString(),
      patientId: newNote.patientId || "",
      patientName: newNote.patientName || "",
      nurseId: "nurse1",
      nurseName: "Current Nurse",
      shift: (newNote.shift as "morning" | "afternoon" | "night") || "morning",
      type: (newNote.type as "general" | "medication" | "vitals" | "observation" | "handover") || "general",
      content: newNote.content || "",
      timestamp: new Date(),
      priority: (newNote.priority as "low" | "medium" | "high") || "medium",
      tags: newNote.tags || [],
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Nursing Notes</h1>
            <p className="text-gray-600">Patient care documentation and shift notes</p>
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
              <AddNoteForm onSubmit={handleAddNote} onCancel={() => setShowAddNote(false)} />
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Notes</p>
                  <p className="text-2xl font-bold">{filteredNotes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold">{filteredNotes.filter((n) => n.priority === "high").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today's Notes</p>
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">My Notes</p>
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
          {filteredNotes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
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
                        {new Date(note.timestamp).toLocaleString()}
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Tag className="mr-2 h-4 w-4" />
                          {note.tags.join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800">{note.content}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
}: {
  onSubmit: (note: Partial<NursingNote>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    patientName: "",
    shift: "",
    type: "",
    content: "",
    priority: "",
    tags: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {mockPatients.map((patient) => (
                <SelectItem key={patient.id} value={patient.name}>
                  {patient.name} - {patient.diagnosis}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shift">Shift *</Label>
          <Select value={formData.shift} onValueChange={(value) => setFormData({ ...formData, shift: value })}>
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
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
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
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
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
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={4}
          placeholder="Enter detailed nursing note..."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="e.g., medication, vitals, fever"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Note</Button>
      </div>
    </form>
  )
}
