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
import { Users, Plus, Search, Mail, Phone, Calendar, Edit, Trash2, UserCheck, UserX } from "lucide-react"
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Staff } from "@/lib/types"

export default function StaffPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  // Unwrap params using React.use()
  const { role } = React.use(params)
  const [staff, setStaff] = useState<Staff[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db) {
      getDocs(collection(db, "users")).then(snapshot => {
        setStaff(
          snapshot.docs.map(docSnap => {
            const data = docSnap.data()
            // Ensure joinDate is a Date object
            let joinDate: Date
            if (data.joinDate instanceof Date) {
              joinDate = data.joinDate
            } else if (data.joinDate && data.joinDate.seconds) {
              // Firestore Timestamp
              joinDate = new Date(data.joinDate.seconds * 1000)
            } else if (typeof data.joinDate === "string") {
              joinDate = new Date(data.joinDate)
            } else {
              joinDate = new Date()
            }
            return {
              id: docSnap.id,
              ...data,
              joinDate,
            } as Staff
          })
        )
      })
    }
  }, [user, loading, router])

  // Only admin can access staff management
  useEffect(() => {
    if (!loading && user && role !== "admin") {
      router.push(`/dashboard/${user.role}`)
    }
  }, [user, loading, role, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || role !== "admin") return null

  const getFilteredStaff = () => {
    let filtered = staff

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.department.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Role filtering
    if (roleFilter !== "all") {
      filtered = filtered.filter((s) => s.role === roleFilter)
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter)
    }

    return filtered
  }

  const filteredStaff = getFilteredStaff()

  const handleAddStaff = async (newStaff: Partial<Staff>) => {
    if (!db) return
    const staffMember: Staff = {
      id: String(Date.now()),
      name: newStaff.name || "",
      email: newStaff.email || "",
      role: (newStaff.role as "admin" | "doctor" | "nurse" | "pharmacist" | "receptionist") || "doctor",
      specialization: newStaff.specialization,
      department: newStaff.department || "",
      phone: newStaff.phone || "",
      status: "active",
      joinDate: new Date(),
    }
    await setDoc(doc(db, "users", staffMember.id), {
      ...staffMember,
      // Firestore does not support Date, so store as ISO string
      joinDate: staffMember.joinDate.toISOString(),
    })
    setStaff([...staff, staffMember])
    setShowAddStaff(false)
  }

  const handleUpdateStaff = async (updatedStaff: Staff) => {
    if (!db) return
    await setDoc(doc(db, "users", updatedStaff.id), {
      ...updatedStaff,
      joinDate: updatedStaff.joinDate instanceof Date
        ? updatedStaff.joinDate.toISOString()
        : updatedStaff.joinDate,
    })
    setStaff(staff.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)))
    setEditingStaff(null)
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!db) return
    await deleteDoc(doc(db, "users", staffId))
    setStaff(staff.filter((s) => s.id !== staffId))
  }

  const handleStatusToggle = async (staffId: string) => {
    if (!db) return
    const staffMember = staff.find((s) => s.id === staffId)
    if (!staffMember) return
    const updatedStatus = staffMember.status === "active" ? "inactive" : "active"
    const updatedStaffMember = { ...staffMember, status: updatedStatus }
    await setDoc(doc(db, "users", staffId), {
      ...updatedStaffMember,
      joinDate: updatedStaffMember.joinDate instanceof Date
        ? updatedStaffMember.joinDate.toISOString()
        : updatedStaffMember.joinDate,
    })
    setStaff(staff.map((s) => (s.id === staffId ? updatedStaffMember : s)))
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-600">Manage hospital staff members and their roles</p>
          </div>
          <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>Enter details for the new staff member</DialogDescription>
              </DialogHeader>
              <AddStaffForm onSubmit={handleAddStaff} onCancel={() => setShowAddStaff(false)} />
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
                    placeholder="Search staff by name, email, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Staff Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-2xl font-bold">{filteredStaff.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Doctors</p>
                  <p className="text-2xl font-bold">{filteredStaff.filter((s) => s.role === "doctor").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Nurses</p>
                  <p className="text-2xl font-bold">{filteredStaff.filter((s) => s.role === "nurse").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold">{filteredStaff.filter((s) => s.status === "active").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold">{filteredStaff.filter((s) => s.status === "inactive").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff List */}
        <div className="grid gap-4">
          {filteredStaff.map((staffMember) => (
            <Card key={staffMember.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{staffMember.name}</h3>
                      <Badge variant={staffMember.status === "active" ? "default" : "secondary"}>
                        {staffMember.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {staffMember.role}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="mr-2 h-4 w-4" />
                        {staffMember.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="mr-2 h-4 w-4" />
                        {staffMember.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="mr-2 h-4 w-4" />
                        {staffMember.department}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="mr-2 h-4 w-4" />
                        Joined: {staffMember.joinDate instanceof Date
                          ? staffMember.joinDate.toLocaleDateString()
                          : new Date(staffMember.joinDate).toLocaleDateString()}
                      </div>
                    </div>

                    {staffMember.specialization && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <strong>Specialization:</strong> {staffMember.specialization}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => setEditingStaff(staffMember)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusToggle(staffMember.id)}>
                      {staffMember.status === "active" ? (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteStaff(staffMember.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredStaff.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Staff Dialog */}
        {editingStaff && (
          <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Staff Member</DialogTitle>
                <DialogDescription>Update staff member details</DialogDescription>
              </DialogHeader>
              <EditStaffForm staff={editingStaff} onSubmit={handleUpdateStaff} onCancel={() => setEditingStaff(null)} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}

function AddStaffForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (staff: Partial<Staff>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    specialization: "",
    department: "",
    phone: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="doctor">Doctor</SelectItem>
              <SelectItem value="nurse">Nurse</SelectItem>
              <SelectItem value="pharmacist">Pharmacist</SelectItem>
              <SelectItem value="receptionist">Receptionist</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            placeholder="For doctors only"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Staff Member</Button>
      </div>
    </form>
  )
}

function EditStaffForm({
  staff,
  onSubmit,
  onCancel,
}: {
  staff: Staff
  onSubmit: (staff: Staff) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: staff.name,
    email: staff.email,
    role: staff.role,
    specialization: staff.specialization || "",
    department: staff.department,
    phone: staff.phone,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedStaff: Staff = {
      ...staff,
      name: formData.name,
      email: formData.email,
      role: formData.role as "admin" | "doctor" | "nurse" | "pharmacist" | "receptionist",
      specialization: formData.specialization || undefined,
      department: formData.department,
      phone: formData.phone,
    }
    onSubmit(updatedStaff)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="doctor">Doctor</SelectItem>
              <SelectItem value="nurse">Nurse</SelectItem>
              <SelectItem value="pharmacist">Pharmacist</SelectItem>
              <SelectItem value="receptionist">Receptionist</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            placeholder="For doctors only"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update Staff Member</Button>
      </div>
    </form>
  )
}
