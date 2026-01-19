/**
 * Patient Auto-Registration Utilities
 * Automatically registers patients when doctors start consultations
 * Ensures no duplicate patient entries
 */

import { db } from './firebase'
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion,
  query,
  where,
  getDocs
} from 'firebase/firestore'
import type { Patient, Appointment } from './types'
import { generateUHID } from './uhid'
import { cleanForFirestore } from './firestore-utils'

/**
 * Auto-register patient from appointment data
 * 
 * This function is idempotent - safe to call multiple times
 * 
 * Logic:
 * 1. Check if patient exists (by patientId or uhid)
 * 2. If not exists, create patient document from appointment data
 * 3. Link patient to doctor (assignedDoctor)
 * 4. Add to doctor's patient history (no duplicates)
 * 
 * @param appointment - The appointment that triggered registration
 * @param doctorId - ID of the doctor starting consultation
 * @param doctorName - Name of the doctor
 * @returns Patient document ID
 */
export async function autoRegisterPatientFromAppointment(
  appointment: Appointment,
  doctorId: string,
  doctorName: string
): Promise<string> {
  if (!db) throw new Error("Database not initialized")

  // Try to find existing patient by patientId or uhid
  let patientId: string | null = null
  let existingPatient: Patient | null = null

  // First, try to find by patientId from appointment
  if (appointment.patientId) {
    try {
      const patientRef = doc(db, "patients", appointment.patientId)
      const patientDoc = await getDoc(patientRef)
      if (patientDoc.exists()) {
        patientId = appointment.patientId
        existingPatient = { id: patientDoc.id, ...patientDoc.data() } as Patient
      }
    } catch (error) {
      console.warn("Error checking patient by ID:", error)
    }
  }

  // If not found, try to find by UHID
  if (!existingPatient && appointment.uhid) {
    try {
      const patientsQuery = query(
        collection(db, "patients"),
        where("uhid", "==", appointment.uhid)
      )
      const snapshot = await getDocs(patientsQuery)
      if (!snapshot.empty) {
        const patientDoc = snapshot.docs[0]
        patientId = patientDoc.id
        existingPatient = { id: patientDoc.id, ...patientDoc.data() } as Patient
      }
    } catch (error) {
      console.warn("Error checking patient by UHID:", error)
    }
  }

  // If patient exists, update it (but don't overwrite existing data)
  if (existingPatient && patientId) {
    const updates: Partial<Patient> = {}

    // Link to doctor if not already assigned
    if (!existingPatient.assignedDoctor || existingPatient.assignedDoctor !== doctorName) {
      updates.assignedDoctor = doctorName
    }

    // Update patient history (no duplicates)
    // Store as string for compatibility with existing UI
    const appointmentDateStr = appointment.appointmentDate instanceof Date
      ? appointment.appointmentDate.toLocaleDateString()
      : new Date(appointment.appointmentDate).toLocaleDateString()
    
    const historyEntry = `${appointment.type} consultation on ${appointmentDateStr} - Dr. ${appointment.doctorName}`

    // Check if this appointment is already in history
    const existingHistory = existingPatient.history || []
    const isInHistory = existingHistory.some((entry: any) => {
      // Handle both string and object formats for backward compatibility
      if (typeof entry === 'string') {
        return entry.includes(appointment.id) || entry.includes(appointmentDateStr)
      } else {
        return entry.id === appointment.id
      }
    })

    if (!isInHistory) {
      updates.history = arrayUnion(historyEntry)
    }

    // Update patient document
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, "patients", patientId), {
        ...updates,
        updatedAt: serverTimestamp()
      })
    }

    return patientId
  }

  // Patient doesn't exist - create new patient document
  const newPatientId = appointment.patientId || doc(collection(db, "patients")).id
  
  // Extract patient data from appointment
  const appointmentDateStr = appointment.appointmentDate instanceof Date
    ? appointment.appointmentDate.toLocaleDateString()
    : new Date(appointment.appointmentDate).toLocaleDateString()
  
  // Build patient object without undefined values
  const newPatientData: Record<string, any> = {
    uhid: appointment.uhid || generateUHID(),
    name: appointment.patientName,
    age: 0, // Will need to be updated later if available
    gender: "male", // Default, should be updated if available
    phone: appointment.patientPhone,
    address: "",
    assignedDoctor: doctorName,
    history: [`${appointment.type} consultation on ${appointmentDateStr} - Dr. ${appointment.doctorName}`],
    bills: [],
    appointments: [appointment.id],
    labOrders: [],
    medicalHistory: [],
    status: "stable", // Default status, will change if admitted
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  
  // Only include optional fields if they have values
  if (appointment.patientPhone) {
    newPatientData.phone = appointment.patientPhone
  }

  // Create patient document (no undefined values)
  await setDoc(doc(db, "patients", newPatientId), cleanForFirestore(newPatientData))

  return newPatientId
}

/**
 * Check if patient is already registered under a doctor
 */
export async function isPatientRegistered(
  patientId: string,
  doctorName: string
): Promise<boolean> {
  if (!db) return false

  try {
    const patientRef = doc(db, "patients", patientId)
    const patientDoc = await getDoc(patientRef)
    
    if (!patientDoc.exists()) return false
    
    const patient = patientDoc.data() as Patient
    return patient.assignedDoctor === doctorName
  } catch (error) {
    console.error("Error checking patient registration:", error)
    return false
  }
}
