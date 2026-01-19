"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, CreditCard, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Patient } from "@/lib/types"
import type { DischargeInitiatedPatient, DischargeExpenseAggregation } from "@/lib/discharge-utils"
import {
  getDischargeReadyPatients,
  aggregateDischargeExpenses,
  finalizeDischargeWithBilling,
  type DischargeExpenseItem
} from "@/lib/discharge-utils"
import { formatCurrency } from "@/lib/billing-utils"

export default function DischargeManagementPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<string>("")
  const [dischargeReadyPatients, setDischargeReadyPatients] = useState<DischargeInitiatedPatient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<DischargeInitiatedPatient | null>(null)
  const [showBillingDialog, setShowBillingDialog] = useState(false)
  const [expenses, setExpenses] = useState<DischargeExpenseAggregation | null>(null)
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "insurance" | "other">("cash")
  const [receivedAmount, setReceivedAmount] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [insuranceProvider, setInsuranceProvider] = useState("")
  const [insuranceClaimNumber, setInsuranceClaimNumber] = useState("")
  
  // Summary state
  const [dischargeSummary, setDischargeSummary] = useState<{
    billId: string
    billNumber: string
    patient: DischargeInitiatedPatient
    expenses: DischargeExpenseAggregation
    paymentMethod: string
    paidAt: Date
  } | null>(null)

  useEffect(() => {
    (async () => {
      const resolvedParams = await params
      setRole(resolvedParams.role)
    })()
  }, [params])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    fetchDischargeReadyPatients()
  }, [user, loading, router])

  const fetchDischargeReadyPatients = async () => {
    try {
      const patients = await getDischargeReadyPatients()
      setDischargeReadyPatients(patients)
    } catch (error) {
      console.error("Error fetching discharge-ready patients:", error)
    }
  }

  const handleProceedToBilling = async (patient: DischargeInitiatedPatient) => {
    setSelectedPatient(patient)
    setShowBillingDialog(true)
    setLoadingExpenses(true)

    try {
      const expenseData = await aggregateDischargeExpenses(patient.id)
      setExpenses(expenseData)
    } catch (error: any) {
      console.error("Error aggregating expenses:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load billing information. Please try again.",
        variant: "destructive"
      })
      setShowBillingDialog(false)
    } finally {
      setLoadingExpenses(false)
    }
  }

  const handleConfirmBilling = () => {
    if (!expenses || !selectedPatient) return
    setShowPaymentDialog(true)
  }

  const handleProcessPayment = async () => {
    if (!selectedPatient || !expenses || !user) return

    setProcessingPayment(true)

    try {
      // Build payment details
      const paymentDetails: Record<string, any> = {}
      
      if (paymentMethod === "cash") {
        const received = parseFloat(receivedAmount)
        if (isNaN(received) || received < expenses.grandTotal) {
          toast({
            title: "Invalid Amount",
            description: `Received amount must be at least ${formatCurrency(expenses.grandTotal)}`,
            variant: "destructive"
          })
          setProcessingPayment(false)
          return
        }
        paymentDetails.receivedAmount = received
        paymentDetails.changeAmount = Math.max(0, received - expenses.grandTotal)
      } else if (paymentMethod === "insurance") {
        paymentDetails.insuranceProvider = insuranceProvider
        paymentDetails.insuranceClaimNumber = insuranceClaimNumber
        if (transactionId) paymentDetails.transactionId = transactionId
      } else {
        // card or upi
        if (transactionId) paymentDetails.transactionId = transactionId
      }

      const receptionistId = user.uid
      const result = await finalizeDischargeWithBilling(
        selectedPatient.id,
        expenses,
        paymentMethod,
        paymentDetails,
        receptionistId
      )

      // Show summary
      setDischargeSummary({
        billId: result.billId,
        billNumber: result.billNumber,
        patient: selectedPatient,
        expenses,
        paymentMethod,
        paidAt: new Date()
      })

      setShowPaymentDialog(false)
      setShowBillingDialog(false)
      setShowSummaryDialog(true)

      // Refresh discharge-ready patients list
      await fetchDischargeReadyPatients()

      toast({
        title: "Discharge Completed",
        description: "Patient discharged successfully. Bill generated and bed freed.",
      })
    } catch (error: any) {
      console.error("Error processing payment:", error)
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleSummaryOk = () => {
    setShowSummaryDialog(false)
    setSelectedPatient(null)
    setExpenses(null)
    // Reset payment form
    setPaymentMethod("cash")
    setReceivedAmount("")
    setTransactionId("")
    setInsuranceProvider("")
    setInsuranceClaimNumber("")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discharge Management</h1>
          <p className="text-muted-foreground">Process patient discharges and final billing</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Discharge Ready</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{dischargeReadyPatients.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting final billing</p>
            </CardContent>
          </Card>
        </div>

        {/* Discharge Ready Patients */}
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground">Discharge Ready Patients</CardTitle>
            <CardDescription className="text-muted-foreground">
              Patients with discharge initiated by doctor. Ready for final billing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dischargeReadyPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No patients ready for discharge billing.
              </div>
            ) : (
              <div className="space-y-4">
                {dischargeReadyPatients.map((patient) => (
                  <Card key={patient.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{patient.name}</h3>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Discharge Initiated
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                            <div>UHID: {patient.uhid}</div>
                            <div>Bed: {patient.assignedBed || "N/A"}</div>
                            <div>Doctor: {patient.assignedDoctor}</div>
                            <div>Status: {patient.status}</div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleProceedToBilling(patient)}
                          className="ml-4"
                        >
                          Proceed to Final Billing
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Dialog */}
        <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card bg-card backdrop-blur-xl shadow-lg">
            <DialogHeader>
              <DialogTitle>Final Billing - {selectedPatient?.name}</DialogTitle>
              <DialogDescription>
                Review all expenses and generate final discharge bill
              </DialogDescription>
            </DialogHeader>

            {loadingExpenses ? (
              <div className="py-8 text-center text-muted-foreground">Loading expenses...</div>
            ) : expenses ? (
              <div className="space-y-6">
                {/* Expense Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Expense Breakdown</h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant="outline">{item.source}</Badge>
                            </TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(expenses.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({expenses.taxRate * 100}%):</span>
                    <span className="font-medium">{formatCurrency(expenses.tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(expenses.grandTotal)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowBillingDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmBilling}>
                    Confirm & Collect Payment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">No expenses found.</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <DialogHeader>
              <DialogTitle>Payment Collection</DialogTitle>
              <DialogDescription>
                Collect payment for {selectedPatient?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {expenses && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(expenses.grandTotal)}</span>
                  </div>
                </div>
              )}

              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "cash" && (
                <div>
                  <Label>Received Amount</Label>
                  <Input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="Enter received amount"
                  />
                </div>
              )}

              {(paymentMethod === "card" || paymentMethod === "upi") && (
                <div>
                  <Label>Transaction ID</Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID"
                  />
                </div>
              )}

              {paymentMethod === "insurance" && (
                <>
                  <div>
                    <Label>Insurance Provider</Label>
                    <Input
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                      placeholder="Enter insurance provider"
                    />
                  </div>
                  <div>
                    <Label>Claim Number</Label>
                    <Input
                      value={insuranceClaimNumber}
                      onChange={(e) => setInsuranceClaimNumber(e.target.value)}
                      placeholder="Enter claim number"
                    />
                  </div>
                  <div>
                    <Label>Transaction ID (Optional)</Label>
                    <Input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter transaction ID"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleProcessPayment} disabled={processingPayment}>
                  {processingPayment ? "Processing..." : "Confirm Payment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Discharge Summary Dialog */}
        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass-card bg-card backdrop-blur-xl shadow-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Discharge Summary
              </DialogTitle>
              <DialogDescription>
                Patient successfully discharged and bill generated
              </DialogDescription>
            </DialogHeader>

            {dischargeSummary && (
              <div className="space-y-6">
                {/* Patient Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Patient Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>Name:</strong> {dischargeSummary.patient.name}</div>
                      <div><strong>UHID:</strong> {dischargeSummary.patient.uhid}</div>
                      <div><strong>Bed Number:</strong> {dischargeSummary.patient.assignedBed || "N/A"}</div>
                      <div><strong>Discharged By:</strong> {dischargeSummary.patient.assignedDoctor}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Expense Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Expense Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {dischargeSummary.expenses.items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span className="text-muted-foreground">{item.description}</span>
                          <span className="font-medium">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(dischargeSummary.expenses.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>{formatCurrency(dischargeSummary.expenses.tax)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Grand Total:</span>
                          <span>{formatCurrency(dischargeSummary.expenses.grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>Bill Number:</strong> {dischargeSummary.billNumber}</div>
                      <div><strong>Payment Method:</strong> {dischargeSummary.paymentMethod.toUpperCase()}</div>
                      <div><strong>Payment Date:</strong> {dischargeSummary.paidAt.toLocaleString()}</div>
                      <div><strong>Status:</strong> <Badge className="bg-green-100 text-green-800">Paid</Badge></div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSummaryOk}>OK</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
