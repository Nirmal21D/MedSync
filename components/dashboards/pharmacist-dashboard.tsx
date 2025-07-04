"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Package, AlertTriangle, CheckCircle, Clock, X } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Prescription, InventoryItem } from "@/lib/types"

// Utility to safely format a date value
function formatDate(dateValue: any) {
  if (!dateValue) return ""
  let dateObj: Date | null = null
  if (dateValue instanceof Date) {
    dateObj = dateValue
  } else if (typeof dateValue === "string" || typeof dateValue === "number") {
    const parsed = new Date(dateValue)
    if (!isNaN(parsed.getTime())) dateObj = parsed
  } else if (typeof dateValue === "object" && dateValue.seconds) {
    // Firestore Timestamp
    dateObj = new Date(dateValue.seconds * 1000)
  }
  return dateObj ? dateObj.toLocaleDateString() : ""
}

export default function PharmacistDashboard() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  useEffect(() => {
    if (!db) return
    getDocs(collection(db, "prescriptions")).then(snapshot => {
      setPrescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)))
    })
    getDocs(collection(db, "inventory")).then(snapshot => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)))
    })
  }, [])

  const pendingPrescriptions = prescriptions.filter((p) => p.status === "pending")
  const approvedPrescriptions = prescriptions.filter((p) => p.status === "approved")
  const medicineInventory = inventory.filter((i) => i.category === "medicine")
  const lowStockMedicines = medicineInventory.filter((i) => i.status === "low-stock" || i.status === "out-of-stock")

  const handleApprovePrescription = (prescriptionId: string) => {
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === prescriptionId
          ? { ...p, status: "approved" as const, processedAt: new Date(), processedBy: "Current Pharmacist" }
          : p,
      ),
    )
  }

  const handleRejectPrescription = (prescriptionId: string) => {
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === prescriptionId
          ? { ...p, status: "rejected" as const, processedAt: new Date(), processedBy: "Current Pharmacist" }
          : p,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pharmacist Dashboard</h1>
        <p className="text-muted-foreground">Prescription management and inventory control</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-black shadow-lg border-none">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
            <CardTitle className="ml-4 text-sm font-medium text-gray-900 dark:text-white">Pending Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{pendingPrescriptions.length}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-black shadow-lg border-none">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
            </div>
            <CardTitle className="ml-4 text-sm font-medium text-gray-900 dark:text-white">Approved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{approvedPrescriptions.length}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">Processed prescriptions</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-black shadow-lg border-none">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Package className="h-4 w-4 text-purple-600 dark:text-purple-300" />
            </div>
            <CardTitle className="ml-4 text-sm font-medium text-gray-900 dark:text-white">Medicine Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{medicineInventory.length}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">Total medicines</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-black shadow-lg border-none">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-300" />
            </div>
            <CardTitle className="ml-4 text-sm font-medium text-gray-900 dark:text-white">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-300">{lowStockMedicines.length}</div>
            <p className="text-xs text-gray-600 dark:text-gray-300">Need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockMedicines.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/40">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Low Stock Medicines
            </CardTitle>
            <CardDescription className="text-orange-600 dark:text-orange-300">Medicines that need immediate restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockMedicines.map((medicine) => (
                <div key={medicine.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{medicine.name}</p>
                    <p className="text-sm text-muted-foreground">Location: {medicine.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={medicine.status === "out-of-stock" ? "destructive" : "secondary"}>
                      {medicine.quantity} {medicine.unit}
                    </Badge>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Min: {medicine.minThreshold} {medicine.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medicine Inventory */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Medicine Inventory
            </span>
            <Button size="sm" variant="outline">
              Update Stock
            </Button>
          </CardTitle>
          <CardDescription className="text-muted-foreground">Current medicine stock levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {medicineInventory.map((medicine) => (
              <div key={medicine.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{medicine.name}</p>
                  <p className="text-sm text-muted-foreground">Location: {medicine.location}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: {formatDate(medicine.lastUpdated)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    {medicine.quantity} {medicine.unit}
                  </p>
                  <Badge
                    variant={
                      medicine.status === "out-of-stock"
                        ? "destructive"
                        : medicine.status === "low-stock"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {medicine.status.replace("-", " ")}
                  </Badge>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Min: {medicine.minThreshold} {medicine.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <CardDescription className="text-muted-foreground">Your recent prescription processing activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {approvedPrescriptions.slice(0, 5).map((prescription) => (
              <div key={prescription.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{prescription.patientName}</p>
                  <p className="text-sm text-muted-foreground">{prescription.medicines.length} medicine(s) approved</p>
                </div>
                <div className="text-right">
                  <Badge variant="default">Approved</Badge>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{prescription.processedAt ? formatDate(prescription.processedAt) : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
