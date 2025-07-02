"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Bed } from "@/lib/types"
import { Bed as BedIcon, Plus } from "lucide-react"

export default function BedManagementPage() {
  const [beds, setBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddBed, setShowAddBed] = useState(false)
  const [newBed, setNewBed] = useState({
    number: "",
    ward: "",
    floor: "",
    type: "general",
    status: "available",
    features: "",
  })
  const [addBedStatus, setAddBedStatus] = useState<string | null>(null)
  const [addBedLoading, setAddBedLoading] = useState(false)
  const [filter, setFilter] = useState({ status: "", type: "", ward: "" })

  useEffect(() => {
    fetchBeds()
  }, [])

  const fetchBeds = async () => {
    setLoading(true)
    if (!db) return
    let q = collection(db, "beds")
    // Filtering can be added here if needed
    const snapshot = await getDocs(q)
    setBeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bed)))
    setLoading(false)
  }

  const handleAddBed = async () => {
    if (!db) return
    if (!newBed.number || !newBed.ward || !newBed.floor || !newBed.type) {
      setAddBedStatus("Please fill all required fields.")
      return
    }
    setAddBedLoading(true)
    try {
      const bedId = `${newBed.ward}-${newBed.number}`.replace(/\s+/g, "-").toLowerCase()
      await setDoc(doc(db, "beds", bedId), {
        number: newBed.number,
        ward: newBed.ward,
        floor: Number(newBed.floor),
        type: newBed.type,
        status: newBed.status,
        features: newBed.features ? newBed.features.split(",").map(f => f.trim()) : [],
      })
      setAddBedStatus("Bed added successfully!")
      setNewBed({ number: "", ward: "", floor: "", type: "general", status: "available", features: "" })
      fetchBeds()
      setTimeout(() => setShowAddBed(false), 1200)
    } catch (err) {
      setAddBedStatus("Failed to add bed. Please try again.")
    } finally {
      setAddBedLoading(false)
    }
  }

  // Filtering logic
  const filteredBeds = beds.filter(bed => {
    return (
      (filter.status ? bed.status === filter.status : true) &&
      (filter.type ? bed.type === filter.type : true) &&
      (filter.ward ? bed.ward.toLowerCase().includes(filter.ward.toLowerCase()) : true)
    )
  })

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><BedIcon className="h-7 w-7 text-blue-600" /> Bed Management</h1>
          <p className="text-gray-600">Manage all hospital beds, add new beds, and filter by status, type, or ward.</p>
        </div>
        <Button onClick={() => setShowAddBed(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Bed
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <Label>Status</Label>
          <Select value={filter.status} onValueChange={value => setFilter(f => ({ ...f, status: value }))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type</Label>
          <Select value={filter.type} onValueChange={value => setFilter(f => ({ ...f, type: value }))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="icu">ICU</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ward</Label>
          <Input value={filter.ward} onChange={e => setFilter(f => ({ ...f, ward: e.target.value }))} placeholder="Search ward..." className="w-40" />
        </div>
      </div>

      {/* Bed List */}
      <Card>
        <CardHeader>
          <CardTitle>All Beds</CardTitle>
          <CardDescription>List of all beds in the hospital</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading beds...</div>
          ) : filteredBeds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No beds found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 border">Number</th>
                    <th className="px-4 py-2 border">Ward</th>
                    <th className="px-4 py-2 border">Floor</th>
                    <th className="px-4 py-2 border">Type</th>
                    <th className="px-4 py-2 border">Status</th>
                    <th className="px-4 py-2 border">Features</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBeds.map(bed => (
                    <tr key={bed.id} className="hover:bg-blue-50">
                      <td className="px-4 py-2 border font-medium">{bed.number}</td>
                      <td className="px-4 py-2 border">{bed.ward}</td>
                      <td className="px-4 py-2 border">{bed.floor}</td>
                      <td className="px-4 py-2 border capitalize">{bed.type}</td>
                      <td className="px-4 py-2 border capitalize">{bed.status}</td>
                      <td className="px-4 py-2 border">{Array.isArray(bed.features) ? bed.features.join(", ") : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bed Modal */}
      <Dialog open={showAddBed} onOpenChange={setShowAddBed}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bed</DialogTitle>
            <DialogDescription>Enter bed details to add a new bed to the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bed Number</Label>
              <Input value={newBed.number} onChange={e => setNewBed({ ...newBed, number: e.target.value })} placeholder="e.g. A-101" />
            </div>
            <div>
              <Label>Ward</Label>
              <Input value={newBed.ward} onChange={e => setNewBed({ ...newBed, ward: e.target.value })} placeholder="e.g. Cardiology" />
            </div>
            <div>
              <Label>Floor</Label>
              <Input type="number" value={newBed.floor} onChange={e => setNewBed({ ...newBed, floor: e.target.value })} placeholder="e.g. 1" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newBed.type} onValueChange={value => setNewBed({ ...newBed, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="icu">ICU</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={newBed.status} onValueChange={value => setNewBed({ ...newBed, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Features (comma separated)</Label>
              <Input value={newBed.features} onChange={e => setNewBed({ ...newBed, features: e.target.value })} placeholder="e.g. Oxygen Supply, Cardiac Monitor" />
            </div>
            {addBedStatus && <div className={`text-sm ${addBedStatus.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{addBedStatus}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddBed(false)}>Cancel</Button>
              <Button onClick={handleAddBed} disabled={addBedLoading}>{addBedLoading ? "Adding..." : "Add Bed"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 