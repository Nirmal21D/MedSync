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
import DashboardLayout from "@/components/layout/dashboard-layout"
import { cn } from "@/lib/utils"

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
  const [filter, setFilter] = useState({ status: "all", type: "all", ward: "" })
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')

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
      (filter.status === "all" ? true : bed.status === filter.status) &&
      (filter.type === "all" ? true : bed.type === filter.type) &&
      (filter.ward ? bed.ward.toLowerCase().includes(filter.ward.toLowerCase()) : true)
    )
  })

  return (
    <DashboardLayout role="admin">
      <div className="relative space-y-6 theme-bg min-h-screen p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">Bed Management</h1>
            <p className="text-muted-foreground">Manage all hospital beds, add new beds, and filter by status, type, or ward.</p>
          </div>
          <Button onClick={() => setShowAddBed(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Bed
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-blue-600 dark:focus:text-blue-400 ${viewMode === 'table' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300'}`}
              onClick={() => setViewMode('table')}
            >
              Table View
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-t border-b border-r border-gray-200 dark:border-gray-700 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-blue-600 dark:focus:text-blue-400 ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300'}`}
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass-card bg-background backdrop-blur-xl shadow mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <Label>Status</Label>
                <Select value={filter.status} onValueChange={value => setFilter(f => ({ ...f, status: value }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
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
                    <SelectItem value="all">All</SelectItem>
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
          </CardContent>
        </Card>

        {viewMode === 'table' && (
          <Card className="glass-card bg-background backdrop-blur-xl shadow mt-6">
            <CardHeader>
              <CardTitle className="text-foreground">All Beds</CardTitle>
              <CardDescription className="text-muted-foreground">List of all beds in the hospital</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading beds...</div>
              ) : filteredBeds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No beds found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="px-4 py-2 border text-foreground">Number</th>
                        <th className="px-4 py-2 border text-foreground">Ward</th>
                        <th className="px-4 py-2 border text-foreground">Floor</th>
                        <th className="px-4 py-2 border text-foreground">Type</th>
                        <th className="px-4 py-2 border text-foreground">Status</th>
                        <th className="px-4 py-2 border text-foreground">Features</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBeds.map(bed => (
                        <tr key={bed.id} className="hover:bg-blue-50 dark:hover:bg-blue-900">
                          <td className="px-4 py-2 border font-medium text-foreground">{bed.number}</td>
                          <td className="px-4 py-2 border text-muted-foreground">{bed.ward}</td>
                          <td className="px-4 py-2 border text-muted-foreground">{bed.floor}</td>
                          <td className="px-4 py-2 border capitalize text-muted-foreground">{bed.type}</td>
                          <td className="px-4 py-2 border capitalize text-muted-foreground">{bed.status}</td>
                          <td className="px-4 py-2 border text-muted-foreground">{Array.isArray(bed.features) ? bed.features.join(", ") : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bed Grid View (Visual, with empty slots) */}
        {viewMode === 'grid' && !loading && filteredBeds.length > 0 && (
          <div className="mt-10">
            <div className="glass-card bg-background backdrop-blur-xl shadow p-8 rounded-2xl">
              <div className="space-y-10">
                {(() => {
                  // Group beds by ward
                  const wardMap = filteredBeds.reduce((acc, bed) => {
                    acc[bed.ward] = acc[bed.ward] || [];
                    acc[bed.ward].push(bed);
                    return acc;
                  }, {} as Record<string, Bed[]>);
                  // Find max beds in any ward or 5
                  const maxBeds = Math.max(5, ...Object.values(wardMap).map(beds => beds.length));
                  return Object.entries(wardMap).map(([ward, beds]) => (
                    <div key={ward}>
                      <h2 className="text-xl font-semibold mb-4 text-center text-foreground">{ward}</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
                        {Array.from({ length: maxBeds }).map((_, idx) => {
                          const bed = beds[idx];
                          if (bed) {
                            return (
                              <div
                                key={bed.id}
                                className={cn(
                                  "rounded-lg shadow flex flex-col items-center justify-center p-4 w-36 h-28 border-2 transition-all",
                                  bed.status === "available" && "bg-emerald-200 border-emerald-400",
                                  bed.status === "occupied" && "bg-red-200 border-red-400",
                                  bed.status === "reserved" && "bg-yellow-200 border-yellow-400",
                                  bed.status === "maintenance" && "bg-gray-200 border-gray-400",
                                  "dark:bg-opacity-30 dark:border-opacity-60"
                                )}
                              >
                                <BedIcon className="h-8 w-8 mb-1 text-foreground" />
                                <div className="font-bold text-lg text-foreground">{bed.number}</div>
                                <div className="text-xs text-muted-foreground capitalize">{bed.type} Bed</div>
                              </div>
                            );
                          } else {
                            return (
                              <button
                                key={`empty-${ward}-${idx}`}
                                type="button"
                                className="rounded-lg bg-gray-100 border-2 border-gray-200 flex flex-col items-center justify-center p-4 w-36 h-28 opacity-70 dark:bg-gray-800 dark:border-gray-700 hover:opacity-100 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition group"
                                onClick={() => {
                                  setShowAddBed(true);
                                  setNewBed(bed => ({ ...bed, ward }));
                                }}
                              >
                                <Plus className="h-8 w-8 text-blue-400 group-hover:text-blue-600" />
                                <span className="mt-2 text-xs text-blue-600 font-medium">Add Bed</span>
                              </button>
                            );
                          }
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

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
    </DashboardLayout>
  )
} 