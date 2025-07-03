"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { setDoc, doc, collection, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

const ROLES = ["admin", "doctor", "nurse", "pharmacist", "receptionist"]

function generatePassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "doctor",
    department: "",
    specialization: "",
    phone: "",
    password: "",
    autoGenerate: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [lastPassword, setLastPassword] = useState("")

  useEffect(() => {
    // Fetch users from Firestore
    const fetchUsers = async () => {
      if (!db) return;
      const querySnapshot = await getDocs(collection(db, "users"))
      setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    }
    fetchUsers()
  }, [success])

  const handleOpen = () => {
    setForm({ name: "", email: "", role: "doctor", department: "", specialization: "", phone: "", password: "", autoGenerate: false })
    setError("")
    setSuccess("")
    setOpen(true)
  }

  const handleChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === "autoGenerate" && value) {
      setForm(prev => ({ ...prev, password: generatePassword() }))
    }
    if (field === "autoGenerate" && !value) {
      setForm(prev => ({ ...prev, password: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")
    if (!auth) {
      setError("❌ Firebase Auth is not initialized. Check your Firebase config.")
      setLoading(false)
      return
    }
    if (!db) {
      setError("❌ Firestore is not initialized. Check your Firebase config.")
      setLoading(false)
      return
    }
    try {
      let password = form.password
      if (form.autoGenerate && !password) {
        password = generatePassword()
      }
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, password)
      // Add user details to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: form.name,
        email: form.email,
        role: form.role,
        department: form.department,
        specialization: form.specialization,
        phone: form.phone,
        joinDate: new Date(),
        status: "active",
      })
      // Show password in success message
      setLastPassword(password)
      setSuccess("User added successfully.")
      setOpen(false)
    } catch (err: any) {
      setError(err.message || "Failed to add user.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">User Management</h2>
        <Button onClick={handleOpen}>Add User</Button>
      </div>
      <div className="glass-card bg-white/70 backdrop-blur-xl shadow-lg p-4">
        <Table className="rounded-2xl overflow-hidden">
          <TableHeader className="bg-emerald-50/60">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Email</TableHead>
              <TableHead className="font-semibold text-gray-700">Role</TableHead>
              <TableHead className="font-semibold text-gray-700">Department</TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, idx) => (
              <TableRow
                key={user.id}
                className={
                  `transition hover:bg-emerald-50/40 ${idx % 2 === 0 ? 'bg-white/60' : 'bg-emerald-50/20'}`
                }
              >
                <TableCell className="font-medium text-gray-900">{user.name}</TableCell>
                <TableCell className="text-gray-700">{user.email}</TableCell>
                <TableCell>
                  <span className={
                    `inline-block px-2 py-1 rounded-full text-xs font-semibold ` +
                    (user.role === 'admin' ? 'bg-red-100 text-red-700' :
                    user.role === 'doctor' ? 'bg-violet-100 text-violet-700' :
                    user.role === 'nurse' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'pharmacist' ? 'bg-orange-100 text-orange-700' :
                    user.role === 'receptionist' ? 'bg-gray-100 text-gray-700' :
                    'bg-gray-100 text-gray-700')
                  }>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="text-gray-700">{user.department}</TableCell>
                <TableCell>
                  <span className={
                    `inline-block px-2 py-1 rounded-full text-xs font-semibold ` +
                    (user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600')
                  }>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div className="bg-white !bg-white rounded-2xl p-6 shadow-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => handleChange("name", e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} required />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={val => handleChange("role", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department (optional)</Label>
                <Input value={form.department} onChange={e => handleChange("department", e.target.value)} />
              </div>
              <div>
                <Label>Specialization (optional)</Label>
                <Input value={form.specialization} onChange={e => handleChange("specialization", e.target.value)} />
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input value={form.phone} onChange={e => handleChange("phone", e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => handleChange("password", e.target.value)}
                  placeholder="Set password or leave blank to auto-generate"
                  disabled={form.autoGenerate}
                />
                <Label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={e => setShowPassword(e.target.checked)}
                  />
                  <span>Show</span>
                </Label>
                <Label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={form.autoGenerate}
                    onChange={e => handleChange("autoGenerate", e.target.checked)}
                  />
                  <span>Auto-generate</span>
                </Label>
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <DialogFooter>
                <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add User"}</Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      {success && (
        <div className="text-green-600 mt-2">
          {success}
          {lastPassword && (
            <div className="text-xs text-gray-700 mt-1">
              <span className="font-semibold">Password:</span> <span className="font-mono">{lastPassword}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 