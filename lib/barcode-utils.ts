/**
 * Barcode Utilities
 * Generate and manage patient barcodes for quick identification
 */

import type { Patient } from "./types"

/**
 * Generate barcode data from UHID
 */
export function generateBarcodeData(uhid: string): string {
  return uhid.toUpperCase()
}

/**
 * Parse scanned barcode to extract UHID
 */
export function parseBarcodeData(barcodeData: string): string {
  // Remove all whitespace, convert to uppercase
  let cleaned = barcodeData.replace(/\s+/g, '').toUpperCase()
  // Replace multiple dashes or spaces with single dash
  cleaned = cleaned.replace(/[-_]+/g, '-')
  return cleaned
}

/**
 * Validate UHID format
 */
export function validateUHID(uhid: string): boolean {
  // Accepts UHID-YYYYMMDD-XXXXX or UHID-YYYYMM-XXXXX (tolerant to extra dashes, spaces, lowercase)
  const cleaned = uhid.replace(/\s+/g, '').toUpperCase().replace(/[-_]+/g, '-')
  const uhidPatternFull = /^UHID-\d{8}-\d{5}$/
  const uhidPatternShort = /^UHID-\d{6}-\d{5}$/
  return uhidPatternFull.test(cleaned) || uhidPatternShort.test(cleaned)
}

/**
 * Search patient by UHID (for barcode scanning)
 */
export async function findPatientByUHID(uhid: string, patients: Patient[]): Promise<Patient | null> {
  return patients.find(p => p.uhid === uhid) || null
}
