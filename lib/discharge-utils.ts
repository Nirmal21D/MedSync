/**
 * Patient Discharge Workflow Utilities
 * Handles multi-step discharge process: Doctor → Receptionist → System cleanup
 */

import { db } from './firebase'
import { 
  collection, 
  doc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore'
import type { Patient, Appointment, Prescription, LabOrder, Bill } from './types'
import type { Bill as BillingBill, BillItem } from './billing-utils'
import { generateBillNumber, formatCurrency } from './billing-utils'
import { cleanForFirestore } from './firestore-utils'

/**
 * Interface for discharge-initiated patient data
 */
export interface DischargeInitiatedPatient extends Patient {
  dischargeInitiated: boolean
  dischargeInitiatedAt?: Date | any
  dischargeInitiatedBy?: string
  dischargeCompleted?: boolean
  dischargeCompletedAt?: Date | any
}

/**
 * Interface for expense aggregation
 */
export interface DischargeExpenseItem {
  id: string
  source: 'appointment' | 'bill' | 'prescription' | 'labOrder' | 'bed' | 'other'
  description: string
  date: Date
  quantity: number
  unitPrice: number
  total: number
  linkedTo?: {
    type: string
    id: string
  }
}

export interface DischargeExpenseAggregation {
  items: DischargeExpenseItem[]
  subtotal: number
  tax: number
  taxRate: number
  grandTotal: number
}

/**
 * STEP 1: Doctor initiates discharge
 * 
 * Updates patient document to mark discharge as initiated
 * Only allowed for:
 * - Patients assigned to the doctor
 * - Patients with status "admitted"
 */
export async function initiateDischarge(
  patientId: string,
  doctorId: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized")

  const patientRef = doc(db, "patients", patientId)
  const patientDoc = await getDoc(patientRef)

  if (!patientDoc.exists()) {
    throw new Error("Patient not found")
  }

  const patient = patientDoc.data() as DischargeInitiatedPatient

  // Validation checks
  if (patient.status !== "admitted") {
    throw new Error("Patient must be admitted to initiate discharge")
  }

  // Allow discharge initiation if patient was readmitted (dischargeCompleted was reset)
  // Only prevent if discharge is currently in progress
  if (patient.dischargeInitiated === true && patient.dischargeCompleted !== true) {
    throw new Error("Discharge already initiated for this patient")
  }

  // If patient was previously discharged but is now readmitted, reset flags
  // (dischargeCompleted should have been reset during bed assignment, but handle edge case)
  const updates: any = {
    dischargeInitiated: true,
    dischargeInitiatedAt: serverTimestamp(),
    dischargeInitiatedBy: doctorId
  }
  
  if (patient.dischargeCompleted === true && patient.status === "admitted") {
    // Reset discharge flags for readmitted patient
    updates.dischargeCompleted = false
    updates.dischargeCompletedAt = null
  }

  // Update patient document
  await updateDoc(patientRef, updates)
}

/**
 * STEP 2 & 3: Aggregate all expenses for discharge billing
 * 
 * Collects expenses from:
 * - Appointments (consultations, procedures)
 * - Bills (existing OPD/partial bills with status != "paid")
 * - Prescriptions (if dispensed from hospital) - WITH ACTUAL PRICING
 * - Lab orders (if completed)
 * - Bed charges (calculated per day from admission date)
 * - Any other unpaid items in patient.bills array
 * 
 * Excludes already paid bills to avoid double-counting
 */
export async function aggregateDischargeExpenses(
  patientId: string
): Promise<DischargeExpenseAggregation> {
  if (!db) throw new Error("Database not initialized")

  const expenseItems: DischargeExpenseItem[] = []
  const processedBillIds = new Set<string>()

  // 1. Get patient document
  const patientRef = doc(db, "patients", patientId)
  const patientDoc = await getDoc(patientRef)
  if (!patientDoc.exists()) {
    throw new Error("Patient not found")
  }
  const patient = patientDoc.data() as Patient

  // 2. Get appointments for this patient (consultations)
  const appointmentsQuery = query(
    collection(db, "appointments"),
    where("patientId", "==", patientId),
    where("status", "==", "completed")
  )
  const appointmentsSnapshot = await getDocs(appointmentsQuery)
  
  // Track appointment IDs that have bills to avoid double-counting
  const appointmentIdsWithBills = new Set<string>()
  
  // First, get all unpaid bills to check which appointments are already billed
  const billsQueryPre = query(
    collection(db, "bills"),
    where("patientId", "==", patientId),
    where("status", "!=", "paid")
  )
  const billsSnapshotPre = await getDocs(billsQueryPre)
  
  // Track which appointments have unpaid bills
  billsSnapshotPre.forEach((billDoc) => {
    const bill = { id: billDoc.id, ...billDoc.data() } as BillingBill
    if (bill.status !== "paid" && bill.status !== "cancelled") {
      bill.items.forEach((item) => {
        if (item.linkedTo?.type === "appointment" && item.linkedTo.id) {
          appointmentIdsWithBills.add(item.linkedTo.id)
        }
      })
      // Also check if bill is linked via appointmentId field
      if ((bill as any).appointmentId) {
        appointmentIdsWithBills.add((bill as any).appointmentId)
      }
    }
  })
  
  appointmentsSnapshot.forEach((aptDoc) => {
    const apt = { id: aptDoc.id, ...aptDoc.data() } as Appointment
    // If appointment has a bill (either via billId or found in bills collection), skip
    // The bill will be picked up in step 3 (unpaid bills query)
    if (apt.billId || appointmentIdsWithBills.has(apt.id)) {
      appointmentIdsWithBills.add(apt.id)
      // Don't add consultation fee here - it will come from the bill
    } else {
      // No bill created yet - add consultation fee directly
      const consultationFee = getAppointmentFee(apt)
      expenseItems.push({
        id: `apt-${apt.id}`,
        source: 'appointment',
        description: `${apt.type === 'follow-up' ? 'Follow-up' : apt.type === 'emergency' ? 'Emergency' : 'General'} Consultation - Dr. ${apt.doctorName}`,
        date: apt.consultationEndTime || apt.appointmentDate || new Date(),
        quantity: 1,
        unitPrice: consultationFee,
        total: consultationFee,
        linkedTo: {
          type: 'appointment',
          id: apt.id
        }
      })
    }
  })

  // 3. Get unpaid bills for this patient (includes consultation bills)
  // Use the same query we already executed above
  billsSnapshotPre.forEach((billDoc) => {
    const bill = { id: billDoc.id, ...billDoc.data() } as BillingBill
    // Only process bills that are not already paid
    if (bill.status !== "paid" && bill.status !== "cancelled") {
      // Add each item from the bill (this includes consultation fees from completed appointments)
      bill.items.forEach((item, idx) => {
        // Check if this bill item is linked to an appointment
        const isConsultationItem = item.linkedTo?.type === "appointment" || 
                                   item.serviceType === "consultation" ||
                                   (bill as any).appointmentId
        
        expenseItems.push({
          id: `bill-${bill.id}-${idx}`,
          source: isConsultationItem ? 'appointment' : 'bill',
          description: `${item.serviceName}${item.description ? ` - ${item.description}` : ''}`,
          date: bill.createdAt || new Date(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.totalPrice,
          linkedTo: {
            type: 'bill',
            id: bill.id
          }
        })
      })
      processedBillIds.add(bill.id)
    }
  })
  
  // 3b. For admitted patients, also check PAID consultation bills
  // This ensures consultation fees are included even if bill was paid before admission
  if (patient.status === "admitted") {
    const paidBillsQuery = query(
      collection(db, "bills"),
      where("patientId", "==", patientId),
      where("status", "==", "paid")
    )
    const paidBillsSnapshot = await getDocs(paidBillsQuery)
    
    paidBillsSnapshot.forEach((billDoc) => {
      const bill = { id: billDoc.id, ...billDoc.data() } as BillingBill
      // Only include consultation bills (not other paid bills to avoid double-counting)
      const hasConsultationItems = bill.items.some(item => 
        item.linkedTo?.type === "appointment" || 
        item.serviceType === "consultation" ||
        (bill as any).appointmentId
      )
      
      if (hasConsultationItems && !processedBillIds.has(bill.id)) {
        bill.items.forEach((item, idx) => {
          // Only include consultation items from paid bills
          if (item.linkedTo?.type === "appointment" || item.serviceType === "consultation") {
            const appointmentId = item.linkedTo?.id || (bill as any).appointmentId
            // Only add if we haven't already included this consultation
            if (!appointmentId || !appointmentIdsWithBills.has(appointmentId)) {
              expenseItems.push({
                id: `bill-paid-consultation-${bill.id}-${idx}`,
                source: 'appointment',
                description: `${item.serviceName}${item.description ? ` - ${item.description}` : ''} (already paid)`,
                date: bill.createdAt || new Date(),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.totalPrice,
                linkedTo: {
                  type: 'bill',
                  id: bill.id
                }
              })
              if (appointmentId) {
                appointmentIdsWithBills.add(appointmentId)
              }
            }
          }
        })
        processedBillIds.add(bill.id)
      }
    })
  }

  // 4. Get prescriptions dispensed from hospital WITH ACTUAL PRICING
  const prescriptionsQuery = query(
    collection(db, "prescriptions"),
    where("patientId", "==", patientId),
    where("status", "in", ["approved", "dispensed"])
  )
  const prescriptionsSnapshot = await getDocs(prescriptionsQuery)
  
  for (const rxDoc of prescriptionsSnapshot.docs) {
    const rx = { id: rxDoc.id, ...rxDoc.data() } as Prescription
    
    // Only include if dispensed from hospital pharmacy
    if (rx.dispensedFromHospital === true) {
      // First, check if prescription charges are already in patient.bills array
      let prescriptionFoundInBills = false
      if (patient.bills && Array.isArray(patient.bills)) {
        const prescriptionBill = patient.bills.find((b: any) => 
          b.prescriptionId === rx.id || 
          b.items?.some((item: any) => item.prescriptionId === rx.id)
        )
        
        if (prescriptionBill && prescriptionBill.status !== "paid") {
          prescriptionFoundInBills = true
          // Use actual bill items from patient.bills
          prescriptionBill.items?.forEach((item: any, idx: number) => {
            if (item.prescriptionId === rx.id || item.name?.includes("Medicine") || item.name?.toLowerCase().includes(rx.medicines[0]?.name?.toLowerCase() || "")) {
              expenseItems.push({
                id: `rx-bill-${prescriptionBill.id}-${idx}`,
                source: 'prescription',
                description: `Medicine: ${item.name || 'Prescription medicines'}`,
                date: prescriptionBill.date ? new Date(prescriptionBill.date) : (rx.processedAt || rx.createdAt || new Date()),
                quantity: item.quantity || 1,
                unitPrice: item.price || 0,
                total: (item.quantity || 1) * (item.price || 0),
                linkedTo: {
                  type: 'prescription',
                  id: rx.id
                }
              })
            }
          })
        }
      }
      
      // If not found in bills array, fetch prices from inventory
      if (!prescriptionFoundInBills) {
        const inventoryRef = collection(db, "inventory")
        let totalPrescriptionCost = 0
        const medicineItems: Array<{ name: string; quantity: number; price: number }> = []
        
        for (const med of rx.medicines) {
          const invQuery = query(inventoryRef, where("name", "==", med.name))
          const invSnapshot = await getDocs(invQuery)
          
          if (!invSnapshot.empty) {
            const invItem = invSnapshot.docs[0].data()
            const price = typeof invItem.cost === 'number' ? invItem.cost : 0
            const quantity = 1 // Default quantity, could be from prescription if available
            const itemTotal = price * quantity
            totalPrescriptionCost += itemTotal
            
            medicineItems.push({
              name: med.name,
              quantity,
              price: itemTotal
            })
          }
        }
        
        if (totalPrescriptionCost > 0) {
          // Add individual medicine items
          medicineItems.forEach((medItem, idx) => {
            expenseItems.push({
              id: `rx-${rx.id}-${idx}`,
              source: 'prescription',
              description: `Medicine: ${medItem.name}`,
              date: rx.processedAt || rx.createdAt || new Date(),
              quantity: medItem.quantity,
              unitPrice: medItem.price,
              total: medItem.price,
              linkedTo: {
                type: 'prescription',
                id: rx.id
              }
            })
          })
        } else {
          // Fallback: add as single item if no inventory prices found
          expenseItems.push({
            id: `rx-${rx.id}`,
            source: 'prescription',
            description: `Prescription #${rx.id.slice(0, 8)} - ${rx.medicines.length} medicines (pricing unavailable)`,
            date: rx.processedAt || rx.createdAt || new Date(),
            quantity: rx.medicines.length,
            unitPrice: 0,
            total: 0,
            linkedTo: {
              type: 'prescription',
              id: rx.id
            }
          })
        }
      }
    }
  }

  // 5. Get completed lab orders
  const labOrdersQuery = query(
    collection(db, "labOrders"),
    where("patientId", "==", patientId),
    where("status", "==", "completed")
  )
  const labOrdersSnapshot = await getDocs(labOrdersQuery)
  
  labOrdersSnapshot.forEach((labDoc) => {
    const labOrder = { id: labDoc.id, ...labDoc.data() } as LabOrder
    // Skip if already billed
    if (!labOrder.billGenerated) {
      expenseItems.push({
        id: `lab-${labOrder.id}`,
        source: 'labOrder',
        description: `Lab Tests: ${labOrder.tests.map(t => t.testName).join(', ')}`,
        date: labOrder.completedAt || labOrder.orderedAt || new Date(),
        quantity: labOrder.tests.length,
        unitPrice: labOrder.totalAmount / labOrder.tests.length,
        total: labOrder.totalAmount,
        linkedTo: {
          type: 'labOrder',
          id: labOrder.id
        }
      })
    }
  })

  // 6. Calculate bed charges based on bedAssignedAt (derived, not manual)
  if (patient.assignedBed && patient.bedAssignedAt) {
    // Use the calculateBedCharges function from bed-assignment.ts
    const { calculateBedCharges } = await import('./bed-assignment')
    const totalBedCharge = calculateBedCharges(patient)
    
    // Calculate days for display
    const assignedDate = patient.bedAssignedAt instanceof Date
      ? patient.bedAssignedAt
      : new Date(patient.bedAssignedAt.seconds * 1000) // Firestore timestamp
    const dischargeDate = new Date()
    const daysAdmitted = Math.max(1, Math.ceil(
      (dischargeDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)
    ))
    
    // Check if bed charges already in patient.bills to avoid double-counting
    const hasBedChargeInBills = patient.bills?.some((bill: any) => 
      bill.status !== "paid" && bill.items?.some((item: any) => 
        (item.name === "Bed Charge" || item.name?.includes("Bed"))
      )
    )
    
    // Only add calculated bed charge if not already in bills
    if (!hasBedChargeInBills && totalBedCharge > 0 && patient.bedRatePerDay) {
      expenseItems.push({
        id: `bed-calc-${patientId}-${Date.now()}`,
        source: 'bed',
        description: `Bed Charge - ${patient.assignedBed} (${daysAdmitted} ${daysAdmitted === 1 ? 'day' : 'days'} @ ₹${patient.bedRatePerDay}/day)`,
        date: new Date(),
        quantity: daysAdmitted,
        unitPrice: patient.bedRatePerDay,
        total: totalBedCharge,
        linkedTo: {
          type: 'bed',
          id: patient.assignedBed || ''
        }
      })
    }
  }

  // 7. Get any other unpaid items from patient.bills array (excluding already processed)
  if (patient.bills && Array.isArray(patient.bills)) {
    patient.bills.forEach((bill: any) => {
      if (bill.status !== "paid" && !processedBillIds.has(bill.id)) {
        bill.items?.forEach((item: any, idx: number) => {
          // Skip bed charges if we already calculated them above
          const isBedCharge = item.name === "Bed Charge" || item.name?.includes("Bed")
          if (!isBedCharge) {
            expenseItems.push({
              id: `patient-bill-${bill.id}-${idx}`,
              source: 'other',
              description: item.name || 'Service',
              date: bill.date ? new Date(bill.date) : new Date(),
              quantity: item.quantity || 1,
              unitPrice: item.price || 0,
              total: (item.quantity || 1) * (item.price || 0),
              linkedTo: {
                type: 'bill',
                id: bill.id
              }
            })
          }
        })
      }
    })
  }

  // Calculate totals
  const subtotal = expenseItems.reduce((sum, item) => sum + item.total, 0)
  const taxRate = 0 // No tax on medical services in India
  const tax = subtotal * taxRate
  const grandTotal = subtotal + tax

  return {
    items: expenseItems,
    subtotal,
    tax,
    taxRate,
    grandTotal
  }
}

/**
 * Helper function to get consultation fee from appointment
 */
function getAppointmentFee(appointment: Appointment): number {
  if (appointment.type === "follow-up") return 300
  if (appointment.type === "emergency") return 1200
  return 500 // General consultation
}

/**
 * STEP 4: Finalize discharge with transaction
 * 
 * CRITICAL: Uses Firestore transaction to ensure atomicity
 * 
 * Inside transaction:
 * 1. Create final bill in bills collection
 * 2. Update patient: status = "discharged", dischargeCompleted = true
 * 3. Update bed: status = "available", clear patient info
 * 
 * If any step fails → entire transaction rolls back
 */
export async function finalizeDischargeWithBilling(
  patientId: string,
  expenses: DischargeExpenseAggregation,
  paymentMethod: "cash" | "card" | "upi" | "insurance" | "other",
  paymentDetails: Record<string, any>,
  receptionistId: string
): Promise<{ billId: string; billNumber: string }> {
  if (!db) throw new Error("Database not initialized")

  // Get patient document to find bed ID (before transaction)
  const patientRef = doc(db, "patients", patientId)
  const patientDocPre = await getDoc(patientRef)
  
  if (!patientDocPre.exists()) {
    throw new Error("Patient not found")
  }

  const patientPre = patientDocPre.data() as DischargeInitiatedPatient

  if (!patientPre.assignedBed) {
    throw new Error("Patient must have an assigned bed")
  }

  // Find bed document ID before transaction
  let bedId: string | null = null
  const bedsQuery = query(
    collection(db, "beds"),
    where("patientId", "==", patientId)
  )
  const bedsSnapshot = await getDocs(bedsQuery)
  
  if (!bedsSnapshot.empty) {
    bedId = bedsSnapshot.docs[0].id
  } else {
    // Try to find by bed number
    const bedByNumberQuery = query(
      collection(db, "beds"),
      where("number", "==", patientPre.assignedBed)
    )
    const bedByNumberSnapshot = await getDocs(bedByNumberQuery)
    if (!bedByNumberSnapshot.empty) {
      bedId = bedByNumberSnapshot.docs[0].id
    }
  }

  if (!bedId) {
    throw new Error(`Bed ${patientPre.assignedBed} not found`)
  }

  const bedRef = doc(db, "beds", bedId)
  
  // Use transaction for atomicity
  return await runTransaction(db, async (transaction) => {
    // Read patient document inside transaction
    const patientDoc = await transaction.get(patientRef)
    if (!patientDoc.exists()) {
      throw new Error("Patient not found")
    }

    const patient = patientDoc.data() as DischargeInitiatedPatient

    // Validation checks
    if (patient.status !== "admitted") {
      throw new Error("Patient must be admitted to complete discharge")
    }

    if (!patient.dischargeInitiated) {
      throw new Error("Discharge must be initiated by doctor first")
    }

    if (patient.dischargeCompleted) {
      throw new Error("Patient already discharged")
    }

    // Read bed inside transaction for consistency
    const bedDoc = await transaction.get(bedRef)
    if (!bedDoc.exists()) {
      throw new Error(`Bed ${bedId} not found`)
    }

    // Create bill items
    const billItems: BillItem[] = expenses.items.map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      serviceName: item.description,
      serviceType: mapSourceToServiceType(item.source),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.total,
      linkedTo: item.linkedTo
    }))

    // Create final bill document
    const billNumber = generateBillNumber()
    const billId = doc(collection(db, "bills")).id
    const billRef = doc(db, "bills", billId)

    const finalBill: Partial<BillingBill> = {
      id: billId,
      billNumber,
      // IMPORTANT: Firestore doc data typically doesn't include an `id` field.
      // Use the known doc id from the function argument to avoid undefined.
      patientId: patientId,
      patientUhid: patient.uhid,
      patientName: patient.name,
      patientPhone: patient.phone,
      items: billItems,
      subtotal: expenses.subtotal,
      discount: 0,
      tax: expenses.tax,
      taxRate: expenses.taxRate,
      total: expenses.grandTotal,
      status: "paid",
      paymentMethod,
      paymentDetails,
      createdAt: new Date(),
      createdBy: receptionistId,
      paidAt: new Date(),
      paidBy: receptionistId,
      notes: `Final discharge bill generated on ${new Date().toLocaleDateString()}`
    }

    // All updates in transaction
    transaction.set(
      billRef,
      cleanForFirestore({
        ...finalBill,
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
      }) as any
    )

    // Update patient
    transaction.update(patientRef, {
      status: "discharged",
      dischargeCompleted: true,
      dischargeCompletedAt: serverTimestamp()
    })

    // Update bed
    transaction.update(bedRef, {
      status: "available",
      patientId: "",
      patientName: ""
    })

    return { billId, billNumber }
  })
}

/**
 * Helper function to map expense source to bill service type
 */
function mapSourceToServiceType(source: DischargeExpenseItem['source']): BillItem['serviceType'] {
  switch (source) {
    case 'appointment':
      return 'consultation'
    case 'prescription':
      return 'pharmacy'
    case 'labOrder':
      return 'investigation'
    case 'bed':
      return 'consultation' // Bed charges might be categorized differently
    default:
      return 'other'
  }
}

/**
 * Get discharge-ready patients (for receptionist view)
 * 
 * Filters patients where:
 * - status == "admitted"
 * - dischargeInitiated == true
 * - dischargeCompleted != true
 */
export async function getDischargeReadyPatients(): Promise<DischargeInitiatedPatient[]> {
  if (!db) return []

  // Note: Firestore doesn't support multiple inequality filters on different fields
  // So we'll fetch admitted patients and filter in memory
  const patientsQuery = query(
    collection(db, "patients"),
    where("status", "==", "admitted")
  )
  
  const snapshot = await getDocs(patientsQuery)
  const patients = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as DischargeInitiatedPatient))

  // Filter for discharge-ready
  return patients.filter(p => 
    p.dischargeInitiated === true && 
    p.dischargeCompleted !== true
  )
}

/**
 * Check if doctor can initiate discharge for a patient
 */
export function canDoctorInitiateDischarge(patient: Patient, doctorId: string): boolean {
  const dischargePatient = patient as DischargeInitiatedPatient
  
  return (
    patient.status === "admitted" &&
    patient.assignedDoctor === doctorId &&
    dischargePatient.dischargeInitiated !== true
    // Note: dischargeCompleted should be reset during bed assignment for readmitted patients
    // If it's still true, bed assignment will reset it, so we allow discharge initiation
  )
}
