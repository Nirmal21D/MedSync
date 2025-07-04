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
import { Package, Plus, Search, AlertTriangle, CheckCircle, Edit, Trash2 } from "lucide-react"
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { InventoryItem } from "@/lib/types"

function parseDateField(item: any): InventoryItem {
  // Ensure lastUpdated is a Date object
  let lastUpdated: Date
  if (item.lastUpdated instanceof Date) {
    lastUpdated = item.lastUpdated
  } else if (item.lastUpdated && typeof item.lastUpdated === "object" && "seconds" in item.lastUpdated) {
    // Firestore Timestamp
    lastUpdated = new Date(item.lastUpdated.seconds * 1000)
  } else if (typeof item.lastUpdated === "string") {
    lastUpdated = new Date(item.lastUpdated)
  } else {
    lastUpdated = new Date()
  }
  return { ...item, lastUpdated }
}

export default function InventoryPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user) {
      getDocs(collection(db, "inventory")).then(snapshot => {
        setInventory(
          snapshot.docs.map(docSnap => {
            const data = docSnap.data()
            return parseDateField({ id: docSnap.id, ...data })
          })
        )
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

  const getFilteredInventory = () => {
    let filtered = inventory

    // Role-based filtering
    if (role === "pharmacist") {
      filtered = inventory.filter((item) => item.category === "medicine")
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.location.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Category filtering
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter)
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter)
    }

    return filtered
  }

  const filteredInventory = getFilteredInventory()

  const handleAddItem = async (newItem: Partial<InventoryItem>) => {
    if (!db) return
    const now = new Date()
    const item: InventoryItem = {
      id: String(Date.now()),
      name: newItem.name || "",
      category: (newItem.category as "equipment" | "supplies" | "medicine") || "supplies",
      quantity: typeof newItem.quantity === "number" ? newItem.quantity : 0,
      unit: newItem.unit || "",
      location: newItem.location || "",
      lastUpdated: now,
      minThreshold: typeof newItem.minThreshold === "number" ? newItem.minThreshold : 0,
      status:
        typeof newItem.quantity === "number" && typeof newItem.minThreshold === "number"
          ? newItem.quantity === 0
            ? "out-of-stock"
            : newItem.quantity <= newItem.minThreshold
              ? "low-stock"
              : "available"
          : "low-stock"
    }
    await setDoc(doc(db, "inventory", item.id), {
      ...item,
      lastUpdated: item.lastUpdated.toISOString(),
    })
    setInventory([...inventory, item])
    setShowAddItem(false)
  }

  const handleUpdateItem = async (updatedItem: InventoryItem) => {
    if (!db) return
    const now = new Date()
    const itemToSave = { ...updatedItem, lastUpdated: now }
    await setDoc(doc(db, "inventory", updatedItem.id), {
      ...itemToSave,
      lastUpdated: now.toISOString(),
    })
    setInventory(
      inventory.map((item) =>
        item.id === updatedItem.id ? { ...itemToSave } : item
      )
    )
    setEditingItem(null)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!db) return
    await deleteDoc(doc(db, "inventory", itemId))
    setInventory(inventory.filter((item) => item.id !== itemId))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "default"
      case "low-stock":
        return "secondary"
      case "out-of-stock":
        return "destructive"
      default:
        return "default"
    }
  }

  return (
    <DashboardLayout role={role}>
      <div className="relative space-y-6 theme-bg min-h-screen p-4 overflow-hidden">
        {/* Animated color blobs */}
        <div className="absolute -z-10 left-1/2 top-1/4 w-[32vw] h-[32vw] bg-emerald-200 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-60%,-40%)'}} />
        <div className="absolute -z-10 right-1/4 bottom-0 w-[28vw] h-[28vw] bg-violet-200 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(40%,40%)'}} />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {role === "pharmacist" ? "Medicine Inventory" : "Inventory Management"}
              </h1>
              <p className="text-muted-foreground">
                {role === "pharmacist" ? "Manage medicine stock levels" : "Track and manage hospital inventory"}
              </p>
            </div>
            <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
              <DialogTrigger asChild>
                <Button type="button">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Inventory Item</DialogTitle>
                  <DialogDescription>Enter details for the new inventory item</DialogDescription>
                </DialogHeader>
                <AddItemForm onSubmit={handleAddItem} onCancel={() => setShowAddItem(false)} role={role} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search inventory by name or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {role !== "pharmacist" && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="medicine">Medicine</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold text-foreground">{filteredInventory.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Package className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold text-foreground">{filteredInventory.filter((i) => i.status === "available").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold text-foreground">{filteredInventory.filter((i) => i.status === "low-stock").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                    <p className="text-2xl font-bold text-foreground">{filteredInventory.filter((i) => i.status === "out-of-stock").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory List - Inventory-like grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
            {filteredInventory.map((item) => {
              // Category icon
              const categoryIcon = item.category === 'medicine' ? <Package className="h-5 w-5 text-violet-500" />
                : item.category === 'equipment' ? <AlertTriangle className="h-5 w-5 text-orange-500" />
                : <CheckCircle className="h-5 w-5 text-green-500" />
              // Status color
              const statusColor = item.status === 'available' ? 'bg-green-100 text-green-700'
                : item.status === 'low-stock' ? 'bg-orange-100 text-orange-700'
                : 'bg-red-100 text-red-700'
              // Fix: Only render inventory items, not the Edit/Delete card
              if (!item.name) return null;
              return (
                <div key={item.id} className="relative group rounded-xl border border-border bg-card shadow-lg hover:scale-[1.03] transition-transform p-4 flex flex-col min-h-[180px]">
                  {/* Accent bar */}
                  <div className="absolute top-0 left-0 w-full h-2 rounded-t-xl bg-violet-500" />
                  {/* Category icon */}
                  <div className="absolute top-3 left-3">{categoryIcon}</div>
                  {/* Actions (hover overlay) */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                    <Button variant="outline" size="icon" className="p-1 h-7 w-7" onClick={() => setEditingItem(item)}>
                      <Edit className="h-4 w-4 text-violet-500" />
                    </Button>
                    {role === "admin" && (
                      <Button variant="outline" size="icon" className="p-1 h-7 w-7" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  {/* Main content */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="break-words text-base font-semibold leading-tight text-center text-foreground">{item.name}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>{item.quantity} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">{item.category}</Badge>
                      <span className="text-xs text-muted-foreground">{item.location}</span>
                    </div>
                  </div>
                  {/* Status at bottom */}
                  <div className="flex justify-center mt-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>{item.status.replace("-", " ")}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredInventory.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items found</h3>
                  <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Item Dialog */}
          {editingItem && (
            <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Inventory Item</DialogTitle>
                  <DialogDescription>Update item details and stock levels</DialogDescription>
                </DialogHeader>
                <EditItemForm
                  item={editingItem}
                  onSubmit={handleUpdateItem}
                  onCancel={() => setEditingItem(null)}
                  role={role}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {filteredInventory.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Item Dialog */}
        {editingItem && (
          <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Inventory Item</DialogTitle>
                <DialogDescription>Update item details and stock levels</DialogDescription>
              </DialogHeader>
              <EditItemForm
                item={editingItem}
                onSubmit={handleUpdateItem}
                onCancel={() => setEditingItem(null)}
                role={role}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && (
          <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Inventory Item</DialogTitle>
                <DialogDescription>Are you sure you want to delete this item? This action cannot be undone.</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => { handleDeleteItem(deleteConfirmId!); setDeleteConfirmId(null); }}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}

function AddItemForm({
  onSubmit,
  onCancel,
  role,
}: {
  onSubmit: (item: Partial<InventoryItem>) => void
  onCancel: () => void
  role: string
}) {
  const [formData, setFormData] = useState<{
    name: string
    category: string
    quantity: string
    unit: string
    location: string
    minThreshold: string
    cost: string
  }>({
    name: "",
    category: role === "pharmacist" ? "medicine" : "",
    quantity: "",
    unit: "",
    location: "",
    minThreshold: "",
    cost: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      quantity: Number.parseInt(formData.quantity) || 0,
      minThreshold: Number.parseInt(formData.minThreshold) || 0,
      cost: formData.category === "medicine" ? Number.parseFloat(formData.cost) || 0 : undefined,
      category: formData.category as "equipment" | "supplies" | "medicine",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
            disabled={role === "pharmacist"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
              <SelectItem value="medicine">Medicine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="e.g., pieces, boxes, bottles"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minThreshold">Minimum Threshold *</Label>
          <Input
            id="minThreshold"
            type="number"
            value={formData.minThreshold}
            onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
            required
            min={0}
          />
        </div>
        {formData.category === "medicine" && (
          <div className="space-y-2">
            <Label htmlFor="cost">Cost per Unit *</Label>
            <Input
              id="cost"
              type="number"
              min={0}
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
            />
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Item</Button>
      </div>
    </form>
  )
}

function EditItemForm({
  item,
  onSubmit,
  onCancel,
  role,
}: {
  item: InventoryItem
  onSubmit: (item: InventoryItem) => void
  onCancel: () => void
  role: string
}) {
  const [formData, setFormData] = useState<{
    name: string
    category: string
    quantity: string
    unit: string
    location: string
    minThreshold: string
    cost: string
  }>({
    name: item.name,
    category: item.category,
    quantity: item.quantity.toString(),
    unit: item.unit,
    location: item.location,
    minThreshold: item.minThreshold.toString(),
    cost: item.cost ? item.cost.toString() : "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const quantityNum = Number.parseInt(formData.quantity) || 0
    const minThresholdNum = Number.parseInt(formData.minThreshold) || 0
    const costNum = formData.category === "medicine" ? Number.parseFloat(formData.cost) || 0 : undefined
    const updatedItem: InventoryItem = {
      ...item,
      name: formData.name,
      category: formData.category as "equipment" | "supplies" | "medicine",
      quantity: quantityNum,
      unit: formData.unit,
      location: formData.location,
      minThreshold: minThresholdNum,
      cost: costNum,
      status:
        quantityNum === 0
          ? "out-of-stock"
          : quantityNum <= minThresholdNum
            ? "low-stock"
            : "available",
    }
    onSubmit(updatedItem)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
            disabled={role === "pharmacist"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
              <SelectItem value="medicine">Medicine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="e.g., pieces, boxes, bottles"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minThreshold">Minimum Threshold *</Label>
          <Input
            id="minThreshold"
            type="number"
            value={formData.minThreshold}
            onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
            required
            min={0}
          />
        </div>
        {formData.category === "medicine" && (
          <div className="space-y-2">
            <Label htmlFor="cost">Cost per Unit *</Label>
            <Input
              id="cost"
              type="number"
              min={0}
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
            />
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  )
}
