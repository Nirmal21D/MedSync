/**
 * Firestore Utilities
 * Helper functions for Firestore operations
 */

/**
 * Remove undefined values from an object
 * Firestore doesn't accept undefined values, so we need to remove them
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {}
  Object.keys(obj).forEach(key => {
    const value = obj[key]
    if (value !== undefined) {
      cleaned[key as keyof T] = value
    }
  })
  return cleaned
}

/**
 * Clean an object for Firestore by removing undefined values
 * and converting null to deleteField() if needed
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {}
  Object.keys(obj).forEach(key => {
    const value = obj[key]
    // Firestore accepts null but not undefined
    if (value !== undefined) {
      cleaned[key as keyof T] = value
    }
  })
  return cleaned
}
