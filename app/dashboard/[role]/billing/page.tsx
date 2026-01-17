"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CreditCard,
  Search,
  Plus,
  Receipt,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Printer,
  Download,
  X,
  User,
  Calendar,
  Phone
} from "lucide-react"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Bill, BillItem } from "@/lib/billing-utils"
import {
  formatCurrency,
  getUnpaidBills,
  getPatientBills,
  processBillPayment,
  applyDiscount,
  saveBill,
  generateBillNumber,
  SERVICE_PRICES
} from "@/lib/billing-utils"
import type { Patient } from "@/lib/types"
import BillPrint from "@/components/BillPrint"

export default function BillingPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { role } = React.use(params)
  
  const [bills, setBills] = useState<Bill[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loadingData, setLoadingData] = useState(true)
  
  // Selected bill for viewing/payment
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [showBillDialog, setShowBillDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  
  // Payment form
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "insurance">("cash")
  const [receivedAmount, setReceivedAmount] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [insuranceProvider, setInsuranceProvider] = useState("")
  const [insuranceClaimNumber, setInsuranceClaimNumber] = useState("")
  const [processingPayment, setProcessingPayment] = useState(false)
  
  // Discount
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [discountAmount, setDiscountAmount] = useState("")
  const [discountReason, setDiscountReason] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    fetchData()
  }, [user, loading, router])

  const fetchData = async () => {
    if (!db) {
      setLoadingData(false)
      return
    }

    try {
      // Fetch all bills
      const billsSnapshot = await getDocs(collection(db, "bills"))
      const billsList = billsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        paidAt: doc.data().paidAt?.toDate()
      } as Bill))
      setBills(billsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))

      // Fetch patients for reference
      const patientsSnapshot = await getDocs(collection(db, "patients"))
      setPatients(patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)))
    } catch (error) {
      console.error("Error fetching billing data:", error)
      toast({
        title: "Error",
        description: "Failed to load billing data",
        variant: "destructive"
      })
    } finally {
      setLoadingData(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedBill || !user) return

    setProcessingPayment(true)
    try {
      // Build payment details object without undefined values
      const paymentDetails: Record<string, any> = {}
      
      if (paymentMethod === "cash") {
        paymentDetails.receivedAmount = parseFloat(receivedAmount)
        paymentDetails.changeAmount = Math.max(0, parseFloat(receivedAmount) - selectedBill.total)
      } else if (paymentMethod === "insurance") {
        if (transactionId) paymentDetails.transactionId = transactionId
        paymentDetails.insuranceProvider = insuranceProvider
        paymentDetails.insuranceClaimNumber = insuranceClaimNumber
      } else {
        // card or upi
        if (transactionId) paymentDetails.transactionId = transactionId
      }

      await processBillPayment(
        selectedBill.id,
        paymentMethod,
        paymentDetails as Bill["paymentDetails"],
        user.uid
      )

      toast({
        title: "Payment Successful",
        description: `Payment of ${formatCurrency(selectedBill.total)} received successfully`,
      })

      setShowPaymentDialog(false)
      setShowBillDialog(false)
      fetchData()
      
      // Reset form
      setPaymentMethod("cash")
      setReceivedAmount("")
      setTransactionId("")
      setInsuranceProvider("")
      setInsuranceClaimNumber("")
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleDiscount = async () => {
    if (!selectedBill || !discountAmount) return

    try {
      await applyDiscount(selectedBill.id, parseFloat(discountAmount), discountReason)
      
      toast({
        title: "Discount Applied",
        description: `Discount of ${formatCurrency(parseFloat(discountAmount))} applied successfully`,
      })

      setShowDiscountDialog(false)
      fetchData()
      
      // Update selected bill
      const updatedBill = { ...selectedBill }
      updatedBill.discount = parseFloat(discountAmount)
      updatedBill.discountReason = discountReason
      updatedBill.total = updatedBill.subtotal + updatedBill.tax - parseFloat(discountAmount)
      setSelectedBill(updatedBill)
      
      setDiscountAmount("")
      setDiscountReason("")
    } catch (error) {
      console.error("Error applying discount:", error)
      toast({
        title: "Error",
        description: "Failed to apply discount",
        variant: "destructive"
      })
    }
  }

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.patientUhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Calculate statistics
  const stats = {
    totalBills: bills.length,
    pendingBills: bills.filter(b => b.status === "pending" || b.status === "draft").length,
    paidBills: bills.filter(b => b.status === "paid").length,
    totalRevenue: bills.filter(b => b.status === "paid").reduce((sum, b) => sum + b.total, 0),
    pendingAmount: bills.filter(b => b.status === "pending" || b.status === "draft").reduce((sum, b) => sum + b.total, 0)
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout role={role}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              OPD Billing & Checkout
            </h1>
            <p className="text-muted-foreground mt-1">Manage patient bills and process payments</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBills}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingBills}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Paid Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paidBills}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.pendingAmount)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Bill number, patient name, UHID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bills ({filteredBills.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>UHID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No bills found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.billNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{bill.patientName}</div>
                            <div className="text-sm text-muted-foreground">{bill.patientPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{bill.patientUhid}</TableCell>
                        <TableCell>{bill.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(bill.total)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bill.status === "paid" ? "default" :
                              bill.status === "pending" ? "secondary" :
                              bill.status === "cancelled" ? "destructive" : "outline"
                            }
                          >
                            {bill.status === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {bill.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {bill.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBill(bill)
                              setShowBillDialog(true)
                            }}
                          >
                            <Receipt className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bill Details Dialog */}
        <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Bill Details - {selectedBill?.billNumber}
              </DialogTitle>
            </DialogHeader>

            {selectedBill && (
              <div className="space-y-6">
                {/* Patient Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Patient Name</Label>
                    <p className="font-semibold">{selectedBill.patientName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">UHID</Label>
                    <p className="font-semibold">{selectedBill.patientUhid}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="font-semibold">{selectedBill.patientPhone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <p className="font-semibold">{selectedBill.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Bill Items */}
                <div>
                  <h3 className="font-semibold mb-3">Bill Items</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBill.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.serviceName}</div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground">{item.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.serviceType}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(item.totalPrice)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(selectedBill.subtotal)}</span>
                  </div>
                  {selectedBill.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Discount
                        {selectedBill.discountReason && ` (${selectedBill.discountReason})`}:
                      </span>
                      <span className="font-semibold">-{formatCurrency(selectedBill.discount)}</span>
                    </div>
                  )}
                  {selectedBill.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({selectedBill.taxRate * 100}%):</span>
                      <span className="font-semibold">{formatCurrency(selectedBill.tax)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedBill.total)}</span>
                  </div>
                </div>

                {/* Status and Payment Info */}
                {selectedBill.status === "paid" && selectedBill.paidAt && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Payment Received</strong>
                      <br />
                      Method: {selectedBill.paymentMethod?.toUpperCase()}
                      <br />
                      Date: {selectedBill.paidAt.toLocaleString()}
                      {selectedBill.paymentDetails?.transactionId && (
                        <>
                          <br />
                          Transaction ID: {selectedBill.paymentDetails.transactionId}
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                  {selectedBill.status === "pending" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowDiscountDialog(true)}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Apply Discount
                      </Button>
                      <Button onClick={() => setShowPaymentDialog(true)}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Collect Payment
                      </Button>
                    </>
                  )}
                </div>

                {/* Print and Download Component */}
                <div className="mt-4">
                  <BillPrint
                    bill={selectedBill}
                    patientName={selectedBill.patientName}
                    patientUhid={selectedBill.patientUhid}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Collect Payment</DialogTitle>
              <DialogDescription>
                Process payment for {selectedBill?.billNumber}
              </DialogDescription>
            </DialogHeader>

            {selectedBill && (
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Amount to Pay</p>
                  <p className="text-3xl font-bold">{formatCurrency(selectedBill.total)}</p>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <Label>Received Amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount received"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                    />
                    {receivedAmount && parseFloat(receivedAmount) >= selectedBill.total && (
                      <p className="text-sm text-green-600">
                        Change: {formatCurrency(parseFloat(receivedAmount) - selectedBill.total)}
                      </p>
                    )}
                  </div>
                )}

                {(paymentMethod === "card" || paymentMethod === "upi") && (
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input
                      placeholder="Enter transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Payment gateway integration will be added here. For now, enter transaction details manually.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {paymentMethod === "insurance" && (
                  <>
                    <div className="space-y-2">
                      <Label>Insurance Provider</Label>
                      <Input
                        placeholder="e.g., Star Health, HDFC Ergo"
                        value={insuranceProvider}
                        onChange={(e) => setInsuranceProvider(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Claim Number</Label>
                      <Input
                        placeholder="Insurance claim number"
                        value={insuranceClaimNumber}
                        onChange={(e) => setInsuranceClaimNumber(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={
                      processingPayment ||
                      (paymentMethod === "cash" && (!receivedAmount || parseFloat(receivedAmount) < selectedBill.total)) ||
                      ((paymentMethod === "card" || paymentMethod === "upi") && !transactionId) ||
                      (paymentMethod === "insurance" && (!insuranceProvider || !insuranceClaimNumber))
                    }
                  >
                    {processingPayment ? "Processing..." : "Confirm Payment"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Discount Dialog */}
        <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Discount</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Discount Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter discount amount"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Reason for discount (e.g., senior citizen, insurance deduction)"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDiscount} disabled={!discountAmount}>
                  Apply Discount
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
