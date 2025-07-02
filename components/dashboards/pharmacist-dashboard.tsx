"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Package, AlertTriangle, CheckCircle, Clock, X } from "lucide-react"
import { mockPrescriptions, mockInventory } from "@/lib/mock-data"
import { useState } from "react"

export default function PharmacistDashboard() {
  const [prescriptions, setPrescriptions] = useState(mockPrescriptions)

  const pendingPrescriptions = prescriptions.filter((p) => p.status === "pending")
  const approvedPrescriptions = prescriptions.filter((p) => p.status === "approved")
  const medicineInventory = mockInventory.filter((i) => i.category === "medicine")
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
        <h1 className="text-3xl font-bold text-gray-900">Pharmacist Dashboard</h1>
        <p className="text-gray-600">Prescription management and inventory control</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPrescriptions.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedPrescriptions.length}</div>
            <p className="text-xs text-muted-foreground">Processed prescriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medicine Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicineInventory.length}</div>
            <p className="text-xs text-muted-foreground">Total medicines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockMedicines.length}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockMedicines.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Low Stock Medicines
            </CardTitle>
            <CardDescription className="text-orange-600">Medicines that need immediate restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockMedicines.map((medicine) => (
                <div key={medicine.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{medicine.name}</p>
                    <p className="text-sm text-gray-600">Location: {medicine.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={medicine.status === "out-of-stock" ? "destructive" : "secondary"}>
                      {medicine.quantity} {medicine.unit}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      Min: {medicine.minThreshold} {medicine.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Prescriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Pending Prescriptions
          </CardTitle>
          <CardDescription>Prescriptions awaiting your review and approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPrescriptions.length > 0 ? (
            <div className="space-y-4">
              {pendingPrescriptions.map((prescription) => (
                <div key={prescription.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{prescription.patientName}</h3>
                      <p className="text-sm text-gray-600">Prescribed by: {prescription.doctorName}</p>
                      <p className="text-sm text-gray-500">Date: {prescription.createdAt.toLocaleDateString()}</p>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <h4 className="font-medium text-sm">Medicines:</h4>
                    {prescription.medicines.map((medicine, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">{medicine.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Dosage: {medicine.dosage}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Frequency: {medicine.frequency}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Duration: {medicine.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {prescription.notes && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm mb-1">Notes:</h4>
                      <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">{prescription.notes}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button onClick={() => handleApprovePrescription(prescription.id)} className="flex-1">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRejectPrescription(prescription.id)}
                      className="flex-1"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No pending prescriptions</p>
          )}
        </CardContent>
      </Card>

      {/* Medicine Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Medicine Inventory
            </span>
            <Button size="sm" variant="outline">
              Update Stock
            </Button>
          </CardTitle>
          <CardDescription>Current medicine stock levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {medicineInventory.map((medicine) => (
              <div key={medicine.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{medicine.name}</p>
                  <p className="text-sm text-gray-600">Location: {medicine.location}</p>
                  <p className="text-sm text-gray-500">Last updated: {medicine.lastUpdated.toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
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
                  <p className="text-sm text-gray-500 mt-1">
                    Min: {medicine.minThreshold} {medicine.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent prescription processing activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {approvedPrescriptions.slice(0, 5).map((prescription) => (
              <div key={prescription.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">{prescription.patientName}</p>
                  <p className="text-sm text-gray-600">{prescription.medicines.length} medicine(s) approved</p>
                </div>
                <div className="text-right">
                  <Badge variant="default">Approved</Badge>
                  <p className="text-sm text-gray-500 mt-1">{prescription.processedAt?.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
