"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Beaker, Clock, AlertCircle, CheckCircle, FileText } from "lucide-react"
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import type { LabTest, LabOrder, Patient } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

// Predefined lab test catalog
const labTestCatalog: Omit<LabTest, 'id'>[] = [
  { testCode: 'CBC', testName: 'Complete Blood Count', category: 'blood', price: 400, turnaroundTime: '2 hours', requirements: 'No fasting required' },
  { testCode: 'LFT', testName: 'Liver Function Test', category: 'blood', price: 800, turnaroundTime: '4 hours', requirements: 'Fasting 8-12 hours' },
  { testCode: 'KFT', testName: 'Kidney Function Test', category: 'blood', price: 700, turnaroundTime: '4 hours', requirements: 'Fasting 8-12 hours' },
  { testCode: 'LIPID', testName: 'Lipid Profile', category: 'blood', price: 600, turnaroundTime: '4 hours', requirements: 'Fasting 12-14 hours' },
  { testCode: 'HBA1C', testName: 'HbA1c (Diabetes)', category: 'blood', price: 500, turnaroundTime: '4 hours', requirements: 'No fasting required' },
  { testCode: 'THYROID', testName: 'Thyroid Function Test', category: 'blood', price: 900, turnaroundTime: '6 hours', requirements: 'No fasting required' },
  { testCode: 'URINE', testName: 'Urine Routine', category: 'urine', price: 200, turnaroundTime: '1 hour', requirements: 'First morning sample preferred' },
  { testCode: 'XRAY-CHEST', testName: 'X-Ray Chest', category: 'imaging', price: 600, turnaroundTime: '1 hour', requirements: 'Remove metal objects' },
  { testCode: 'ECG', testName: 'Electrocardiogram', category: 'other', price: 300, turnaroundTime: '30 minutes', requirements: 'Rest 5 minutes before test' },
  { testCode: 'CULTURE', testName: 'Blood Culture', category: 'pathology', price: 1200, turnaroundTime: '48 hours', requirements: 'Before antibiotics if possible' },
]

export default function LabOrdersPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { role } = React.use(params)
  
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showNewOrder, setShowNewOrder] = useState(false)
  
  // New order form
  const [selectedPatient, setSelectedPatient] = useState("")
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user) {
      // Fetch lab orders
      getDocs(collection(db, "labOrders")).then(snapshot => {
        setLabOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabOrder)))
      })
      // Fetch patients
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

  const getFilteredOrders = () => {
    let filtered = labOrders

    // Role-based filtering
    if (role === "doctor") {
      const doctorName = user?.displayName || user?.name
      filtered = labOrders.filter(order => order.doctorName === doctorName)
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        order =>
          order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.patientUhid.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    return filtered.sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
  }

  const filteredOrders = getFilteredOrders()

  const handleTestSelection = (testCode: string) => {
    setSelectedTests(prev =>
      prev.includes(testCode)
        ? prev.filter(t => t !== testCode)
        : [...prev, testCode]
    )
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPatient || selectedTests.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select patient and at least one test",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)

    try {
      const patient = patients.find(p => p.id === selectedPatient)
      if (!patient) throw new Error("Patient not found")

      const tests = selectedTests.map(code => {
        const test = labTestCatalog.find(t => t.testCode === code)
        return {
          testId: code,
          testName: test?.testName || code,
          price: test?.price || 0
        }
      })

      const totalAmount = tests.reduce((sum, test) => sum + test.price, 0)

      const order: LabOrder = {
        id: `LAB-${Date.now()}`,
        orderId: `LAB-${Date.now()}`,
        patientId: patient.id,
        patientUhid: patient.uhid,
        patientName: patient.name,
        doctorId: user.uid || "doctor1",
        doctorName: user.displayName || user.name || "Doctor",
        tests,
        totalAmount,
        status: "pending",
        priority,
        orderedAt: new Date(),
        notes,
        billGenerated: false
      }

      if (db) {
        await setDoc(doc(db, "labOrders", order.id), order)
        setLabOrders([order, ...labOrders])
        
        toast({
          title: "Lab Order Created",
          description: `Order ${order.orderId} created successfully`,
        })

        // Reset form
        setSelectedPatient("")
        setSelectedTests([])
        setPriority("routine")
        setNotes("")
        setShowNewOrder(false)
      }
    } catch (error) {
      console.error("Error creating lab order:", error)
      toast({
        title: "Order Failed",
        description: "Failed to create lab order. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedTestDetails = selectedTests.map(code =>
    labTestCatalog.find(t => t.testCode === code)
  ).filter(Boolean)

  const estimatedTotal = selectedTestDetails.reduce((sum, test) => sum + (test?.price || 0), 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lab Orders</h1>
          <p className="text-muted-foreground">Manage laboratory test orders</p>
        </div>
        {role === "doctor" && (
          <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Lab Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Lab Order</DialogTitle>
                <DialogDescription>Select patient and tests to order</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitOrder} className="space-y-6">
                {/* Patient Selection */}
                <div>
                  <Label>Select Patient *</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} ({patient.uhid})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Selection */}
                <div>
                  <Label>Select Tests *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 max-h-96 overflow-y-auto p-4 border rounded-lg">
                    {labTestCatalog.map(test => (
                      <Card key={test.testCode} className="cursor-pointer hover:bg-muted/50" onClick={() => handleTestSelection(test.testCode)}>
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={selectedTests.includes(test.testCode)}
                              onCheckedChange={() => handleTestSelection(test.testCode)}
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{test.testName}</p>
                                  <p className="text-xs text-muted-foreground">{test.testCode}</p>
                                </div>
                                <Badge variant="outline">₹{test.price}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                <Clock className="inline h-3 w-3 mr-1" />
                                {test.turnaroundTime}
                              </p>
                              {test.requirements && (
                                <p className="text-xs text-orange-600 mt-1">{test.requirements}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <Label>Priority</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                      type="button"
                      variant={priority === "routine" ? "default" : "outline"}
                      onClick={() => setPriority("routine")}
                    >
                      Routine
                    </Button>
                    <Button
                      type="button"
                      variant={priority === "urgent" ? "default" : "outline"}
                      onClick={() => setPriority("urgent")}
                    >
                      Urgent
                    </Button>
                    <Button
                      type="button"
                      variant={priority === "stat" ? "default" : "outline"}
                      onClick={() => setPriority("stat")}
                    >
                      STAT
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Clinical Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any relevant clinical information..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Summary */}
                {selectedTests.length > 0 && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Tests Selected:</span>
                          <span>{selectedTests.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Estimated Total:</span>
                          <span className="text-lg font-bold">₹{estimatedTotal}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating Order..." : "Create Lab Order"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name, UHID, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sample-collected">Sample Collected</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lab Orders List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <Card key={order.id} className="glass-card bg-card backdrop-blur-xl shadow-lg">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Beaker className="h-5 w-5" />
                          Order #{order.orderId}
                        </h3>
                        <p className="text-sm text-muted-foreground">{order.patientName} ({order.patientUhid})</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'}>
                          {order.status}
                        </Badge>
                        <Badge variant={order.priority === 'stat' ? 'destructive' : order.priority === 'urgent' ? 'secondary' : 'outline'}>
                          {order.priority}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Ordered By</p>
                        <p className="font-medium">Dr. {order.doctorName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ordered At</p>
                        <p className="font-medium">{new Date(order.orderedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tests ({order.tests.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {order.tests.map((test, idx) => (
                          <Badge key={idx} variant="outline">{test.testName}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-xl font-bold">₹{order.totalAmount}</p>
                      </div>
                      {!order.billGenerated && (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Billing Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Beaker className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-muted-foreground">No lab orders found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
