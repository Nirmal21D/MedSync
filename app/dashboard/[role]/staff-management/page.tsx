"use client"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { collection, getDocs, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Staff } from "@/lib/types"

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [salaryInput, setSalaryInput] = useState<number | "">("")

  useEffect(() => {
    if (!db) return
    getDocs(collection(db, "users")).then(snapshot => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)))
    })
  }, [])

  const handleEdit = (id: string, currentSalary?: number) => {
    setEditingId(id)
    setSalaryInput(typeof currentSalary === "number" ? currentSalary : "")
  }

  const handleSave = async (id: string) => {
    if (!db || salaryInput === "") return
    await updateDoc(doc(db, "users", id), { salary: Number(salaryInput) })
    setStaff(staff =>
      staff.map(s => (s.id === id ? { ...s, salary: Number(salaryInput) } : s))
    )
    setEditingId(null)
    setSalaryInput("")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Salary Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Salary (₹/month)</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">{s.role}</td>
                    <td className="p-2">{s.department}</td>
                    <td className="p-2">
                      {editingId === s.id ? (
                        <Input
                          type="number"
                          value={salaryInput}
                          onChange={e => setSalaryInput(Number(e.target.value))}
                          className="w-32"
                        />
                      ) : typeof s.salary === "number" ? (
                        <span className="font-semibold">₹{s.salary.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="p-2">
                      {editingId === s.id ? (
                        <Button size="sm" onClick={() => handleSave(s.id)}>
                          Save
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEdit(s.id, s.salary)}>
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}