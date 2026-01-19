/**
 * Bed Assignment Utilities
 * Handles bed assignment with Firestore transactions
 */

import { db } from './firebase'
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  runTransaction,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore'
import type { Patient, Appointment, Bed } from './types'

/**
 * Assign bed to patient using Firestore transaction
 * 
 * Updates in ONE transaction:
 * 1. beds collection: status = "occupied", patientId, patientName
 * 2. patients collection: assignedBed, status = "admitted", admissionDate, bedAssignedAt, bedRatePerDay
 * 3. appointments collection: bedRequestStatus = "approved"
 * 
 * @param bedId - ID of the bed to assign
 * @param patientId - ID of the patient
 * @param appointmentId - ID of the appointment that requested the bed
 * @param bedRatePerDay - Daily bed charge (default: 200)
 * @returns Promise<void>
 */
export async function assignBedToPatient(
  bedId: string,
  patientId: string,
  appointmentId: string,
  bedRatePerDay: number = 200
): Promise<void> {
  if (!db) throw new Error("Database not initialized")

  const bedRef = doc(db, "beds", bedId)
  const patientRef = doc(db, "patients", patientId)
  const appointmentRef = doc(db, "appointments", appointmentId)

  // Use transaction for atomicity
  await runTransaction(db, async (transaction) => {
    // Read all documents
    const bedDoc = await transaction.get(bedRef)
    const patientDoc = await transaction.get(patientRef)
    const appointmentDoc = await transaction.get(appointmentRef)

    // Validate bed exists and is available
    if (!bedDoc.exists()) {
      throw new Error("Bed not found")
    }
    const bed = bedDoc.data() as Bed
    if (bed.status !== "available") {
      throw new Error(`Bed ${bed.number} is not available (status: ${bed.status})`)
    }

    // Validate patient exists
    if (!patientDoc.exists()) {
      throw new Error("Patient not found")
    }
    const patient = patientDoc.data() as Patient

    // Validate appointment exists and has bed request
    if (!appointmentDoc.exists()) {
      throw new Error("Appointment not found")
    }
    const appointment = appointmentDoc.data() as Appointment
    if (!appointment.bedRequested || appointment.bedRequestStatus !== "pending") {
      throw new Error("Appointment does not have a pending bed request")
    }

    // Update bed
    transaction.update(bedRef, {
      status: "occupied",
      patientId: patientId,
      patientName: patient.name,
      updatedAt: serverTimestamp()
    })

    // Update patient
    transaction.update(patientRef, {
      assignedBed: bed.number, // Store bed number, not ID
      status: "admitted",
      admissionDate: serverTimestamp(),
      bedAssignedAt: serverTimestamp(),
      bedRatePerDay: bedRatePerDay,
      // Reset discharge flags for readmission
      dischargeInitiated: false,
      dischargeCompleted: false,
      dischargeInitiatedAt: null,
      dischargeInitiatedBy: null,
      dischargeCompletedAt: null,
      updatedAt: serverTimestamp()
    })

    // Update appointment
    transaction.update(appointmentRef, {
      bedRequestStatus: "approved",
      updatedAt: serverTimestamp()
    })
  })
}

/**
 * Get pending bed requests
 * 
 * Returns appointments where:
 * - bedRequested == true
 * - bedRequestStatus == "pending"
 */
export async function getPendingBedRequests(): Promise<Appointment[]> {
  if (!db) return []

  try {
    const appointmentsQuery = query(
      collection(db, "appointments"),
      where("bedRequested", "==", true),
      where("bedRequestStatus", "==", "pending")
    )
    
    const snapshot = await getDocs(appointmentsQuery)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Appointment))
  } catch (error) {
    console.error("Error fetching pending bed requests:", error)
    return []
  }
}

/**
 * Calculate bed charges based on bedAssignedAt
 * 
 * @param patient - Patient document
 * @param dischargeDate - Date of discharge (defaults to now)
 * @returns Total bed charges
 */
export function calculateBedCharges(
  patient: Patient,
  dischargeDate: Date = new Date()
): number {
  if (!patient.bedAssignedAt || !patient.bedRatePerDay) {
    return 0
  }

  const assignedDate = patient.bedAssignedAt instanceof Date
    ? patient.bedAssignedAt
    : new Date(patient.bedAssignedAt.seconds * 1000) // Firestore timestamp

  const daysAdmitted = Math.max(1, Math.ceil(
    (dischargeDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)
  ))

  return daysAdmitted * patient.bedRatePerDay
}
