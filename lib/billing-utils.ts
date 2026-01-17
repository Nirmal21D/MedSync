/**
 * OPD Billing Utilities
 * Handles bill generation, calculations, and payment processing
 */

import { db } from './firebase'
import { collection, doc, setDoc, updateDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import type { Appointment, Prescription, LabOrder, Patient } from './types'

export interface Bill {
  id: string
  billNumber: string
  patientId: string
  patientUhid: string
  patientName: string
  patientPhone: string
  appointmentId?: string
  items: BillItem[]
  subtotal: number
  discount: number
  discountReason?: string
  tax: number
  taxRate: number
  total: number
  status: "draft" | "pending" | "paid" | "partially-paid" | "cancelled"
  paymentMethod?: "cash" | "card" | "upi" | "insurance" | "other"
  paymentDetails?: {
    transactionId?: string
    receivedAmount?: number
    changeAmount?: number
    insuranceProvider?: string
    insuranceClaimNumber?: string
  }
  createdAt: Date
  createdBy: string
  paidAt?: Date
  paidBy?: string
  notes?: string
}

export interface BillItem {
  id: string
  serviceName: string
  serviceType: "consultation" | "procedure" | "investigation" | "pharmacy" | "document" | "other"
  quantity: number
  unitPrice: number
  totalPrice: number
  linkedTo?: {
    type: "appointment" | "prescription" | "labOrder"
    id: string
  }
  description?: string
}

// Service pricing catalog
export const SERVICE_PRICES = {
  consultation: {
    general: 500,
    specialist: 800,
    emergency: 1200,
    followup: 300,
  },
  procedure: {
    ecg: 300,
    xray: 600,
    ultrasound: 1000,
    bloodPressure: 50,
    dressing: 200,
  },
  investigation: {
    bloodTest: 400,
    urineTest: 200,
    cbcTest: 500,
    liverFunction: 800,
    kidneyFunction: 700,
  },
  document: {
    medicalCertificate: 100,
    prescription: 50,
    reportCopy: 50,
  },
}

/**
 * Generate a unique bill number
 */
export function generateBillNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `BILL-${year}${month}${day}-${random}`
}

/**
 * Calculate consultation fee based on appointment type and doctor specialty
 */
export function getConsultationFee(appointment: Appointment, doctorSpecialization?: string): number {
  if (appointment.type === "follow-up") {
    return SERVICE_PRICES.consultation.followup
  }
  if (appointment.type === "emergency") {
    return SERVICE_PRICES.consultation.emergency
  }
  // Check if specialist
  const specialties = ["cardiology", "neurology", "orthopedics", "pediatrics", "gynecology"]
  const isSpecialist = doctorSpecialization && 
    specialties.some(s => doctorSpecialization.toLowerCase().includes(s))
  
  return isSpecialist ? SERVICE_PRICES.consultation.specialist : SERVICE_PRICES.consultation.general
}

/**
 * Generate bill from completed appointment
 */
export async function generateBillFromAppointment(
  appointment: Appointment,
  patient: Patient,
  currentUser: { uid: string, name: string },
  additionalItems: BillItem[] = []
): Promise<Bill> {
  
  const billNumber = generateBillNumber()
  
  // Get doctor info for consultation fee calculation
  let doctorSpecialization = ""
  if (db) {
    try {
      const doctorDoc = await getDoc(doc(db, "users", appointment.doctorId))
      if (doctorDoc.exists()) {
        doctorSpecialization = doctorDoc.data().specialization || ""
      }
    } catch (error) {
      console.error("Error fetching doctor info:", error)
    }
  }
  
  // Base consultation charge
  const consultationFee = getConsultationFee(appointment, doctorSpecialization)
  const consultationItem: BillItem = {
    id: `item-${Date.now()}-1`,
    serviceName: `${appointment.type === "follow-up" ? "Follow-up" : appointment.type === "emergency" ? "Emergency" : "General"} Consultation`,
    serviceType: "consultation",
    quantity: 1,
    unitPrice: consultationFee,
    totalPrice: consultationFee,
    linkedTo: {
      type: "appointment",
      id: appointment.id
    },
    description: `Consultation with Dr. ${appointment.doctorName} - ${appointment.department}`
  }
  
  const items: BillItem[] = [consultationItem, ...additionalItems]
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const taxRate = 0 // No tax on medical services in India
  const tax = subtotal * taxRate
  const discount = 0
  const total = subtotal + tax - discount
  
  const bill: Bill = {
    id: db ? doc(collection(db, "bills")).id : `bill-${Date.now()}`,
    billNumber,
    patientId: patient.id,
    patientUhid: patient.uhid,
    patientName: patient.name,
    patientPhone: patient.phone,
    appointmentId: appointment.id,
    items,
    subtotal,
    discount,
    tax,
    taxRate,
    total,
    status: "pending",
    createdAt: new Date(),
    createdBy: currentUser.uid,
    notes: `OPD bill generated for appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()}`
  }
  
  return bill
}

/**
 * Save bill to Firestore
 */
export async function saveBill(bill: Bill): Promise<void> {
  if (!db) throw new Error("Database not initialized")
  
  const billRef = doc(db, "bills", bill.id)
  await setDoc(billRef, {
    ...bill,
    createdAt: serverTimestamp(),
  })
}

/**
 * Update bill with prescription charges
 */
export async function addPrescriptionToBill(
  billId: string,
  prescription: any,
  medicines: Array<{ name: string, quantity: number, price: number }>
): Promise<void> {
  if (!db) throw new Error("Database not initialized")
  
  const billRef = doc(db, "bills", billId)
  const billDoc = await getDoc(billRef)
  
  if (!billDoc.exists()) throw new Error("Bill not found")
  
  const bill = billDoc.data() as Bill
  
  // Add medicine items
  const medicineItems: BillItem[] = medicines.map((med, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    serviceName: `Medicine: ${med.name}`,
    serviceType: "pharmacy",
    quantity: med.quantity,
    unitPrice: med.price,
    totalPrice: med.quantity * med.price,
    linkedTo: {
      type: "prescription",
      id: prescription.id
    }
  }))
  
  const updatedItems = [...bill.items, ...medicineItems]
  const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const tax = subtotal * bill.taxRate
  const total = subtotal + tax - bill.discount
  
  await updateDoc(billRef, {
    items: updatedItems,
    subtotal,
    tax,
    total
  })
}

/**
 * Update bill with lab charges
 */
export async function addLabOrderToBill(
  billId: string,
  labOrder: LabOrder
): Promise<void> {
  if (!db) throw new Error("Database not initialized")
  
  const billRef = doc(db, "bills", billId)
  const billDoc = await getDoc(billRef)
  
  if (!billDoc.exists()) throw new Error("Bill not found")
  
  const bill = billDoc.data() as Bill
  
  // Add lab test items
  const labItems: BillItem[] = labOrder.tests.map((test, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    serviceName: `Lab Test: ${test.testName}`,
    serviceType: "investigation",
    quantity: 1,
    unitPrice: test.price,
    totalPrice: test.price,
    linkedTo: {
      type: "labOrder",
      id: labOrder.id
    }
  }))
  
  const updatedItems = [...bill.items, ...labItems]
  const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const tax = subtotal * bill.taxRate
  const total = subtotal + tax - bill.discount
  
  await updateDoc(billRef, {
    items: updatedItems,
    subtotal,
    tax,
    total
  })
}

/**
 * Apply discount to bill
 */
export async function applyDiscount(
  billId: string,
  discountAmount: number,
  reason: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized")
  
  const billRef = doc(db, "bills", billId)
  const billDoc = await getDoc(billRef)
  
  if (!billDoc.exists()) throw new Error("Bill not found")
  
  const bill = billDoc.data() as Bill
  const total = bill.subtotal + bill.tax - discountAmount
  
  await updateDoc(billRef, {
    discount: discountAmount,
    discountReason: reason,
    total: Math.max(0, total)
  })
}

/**
 * Process payment for bill
 */
export async function processBillPayment(
  billId: string,
  paymentMethod: Bill["paymentMethod"],
  paymentDetails: Bill["paymentDetails"],
  paidBy: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized")
  
  const billRef = doc(db, "bills", billId)
  
  // Clean up paymentDetails to remove undefined values (Firebase doesn't accept them)
  const cleanPaymentDetails: Record<string, any> = {}
  if (paymentDetails) {
    Object.entries(paymentDetails).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanPaymentDetails[key] = value
      }
    })
  }
  
  await updateDoc(billRef, {
    status: "paid",
    paymentMethod,
    paymentDetails: cleanPaymentDetails,
    paidAt: serverTimestamp(),
    paidBy
  })
}

/**
 * Get all bills for a patient
 */
export async function getPatientBills(patientId: string): Promise<Bill[]> {
  if (!db) return []
  
  const billsQuery = query(
    collection(db, "bills"),
    where("patientId", "==", patientId)
  )
  
  const snapshot = await getDocs(billsQuery)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill))
}

/**
 * Get bill by appointment
 */
export async function getBillByAppointment(appointmentId: string): Promise<Bill | null> {
  if (!db) return null
  
  const billsQuery = query(
    collection(db, "bills"),
    where("appointmentId", "==", appointmentId)
  )
  
  const snapshot = await getDocs(billsQuery)
  if (snapshot.empty) return null
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Bill
}

/**
 * Get unpaid bills
 */
export async function getUnpaidBills(): Promise<Bill[]> {
  if (!db) return []
  
  const billsQuery = query(
    collection(db, "bills"),
    where("status", "in", ["pending", "draft", "partially-paid"])
  )
  
  const snapshot = await getDocs(billsQuery)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill))
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
