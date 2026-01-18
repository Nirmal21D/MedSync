/**
 * UHID (Unique Hospital ID) Utilities
 * Generates and validates hospital patient identifiers
 */

/**
 * Generate a unique hospital ID
 * Format: UHID-YYYYMM-XXXXX
 * Example: UHID-202601-00001
 */
export function generateUHID(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 99999)
  const sequence = String(random).padStart(5, '0')
  
  return `UHID-${year}${month}-${sequence}`
}

/**
 * Validate UHID format
 */
export function isValidUHID(uhid: string): boolean {
  const uhidPattern = /^UHID-\d{6}-\d{5}$/
  return uhidPattern.test(uhid)
}

/**
 * Extract date from UHID
 */
export function extractDateFromUHID(uhid: string): Date | null {
  if (!isValidUHID(uhid)) return null
  
  const datePart = uhid.split('-')[1]
  const year = parseInt(datePart.substring(0, 4))
  const month = parseInt(datePart.substring(4, 6)) - 1
  
  return new Date(year, month, 1)
}

/**
 * Generate barcode data URL for UHID
 * Uses a simple barcode-like representation
 */
export function generateBarcodeDataURL(uhid: string): string {
  // For now, we'll use a simple text representation
  // In production, integrate with a barcode library like 'react-barcode' or 'jsbarcode'
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">
      <rect width="300" height="100" fill="white"/>
      <text x="150" y="30" text-anchor="middle" font-family="monospace" font-size="20" fill="black">${uhid}</text>
      <g transform="translate(20, 40)">
        ${generateBarcodeLines(uhid)}
      </g>
      <text x="150" y="95" text-anchor="middle" font-family="Arial" font-size="12" fill="black">${uhid}</text>
    </svg>
  `)}`
}

/**
 * Generate barcode lines (simple representation)
 */
function generateBarcodeLines(data: string): string {
  const chars = data.split('')
  let lines = ''
  let x = 0
  
  chars.forEach((char, index) => {
    const width = (char.charCodeAt(0) % 3) + 2
    const height = 40
    const spacing = 2
    
    lines += `<rect x="${x}" y="0" width="${width}" height="${height}" fill="black"/>`
    x += width + spacing
  })
  
  return lines
}

/**
 * Format UHID for display
 */
export function formatUHID(uhid: string): string {
  if (!isValidUHID(uhid)) return uhid
  return uhid // Already in good format
}

/**
 * Parse scanned barcode to UHID
 * Handles various scanner outputs
 */
export function parseBarcodeToUHID(scannedData: string): string | null {
  // Clean the scanned data
  const cleaned = scannedData.trim().toUpperCase()
  
  // Check if it's already a valid UHID
  if (isValidUHID(cleaned)) {
    return cleaned
  }
  
  // Try to extract UHID pattern from the data
  const match = cleaned.match(/UHID-\d{6}-\d{5}/)
  if (match) {
    return match[0]
  }
  
  return null
}
