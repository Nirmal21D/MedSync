import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = "hospital"
const COLLECTION_NAME = "medicine"

// Cache MongoDB client connection
let client: MongoClient | null = null

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
  }
  return client
}

interface RecommendationResponse {
  dosage: string
  frequency: string
  duration: string
  source: "database" | "default" | "computed"
}

/**
 * Rule-based defaults when medicine data is incomplete
 */
function getDefaultRecommendations(medicineName: string): RecommendationResponse {
  // Extract strength from medicine name if present (e.g., "Paracetamol 500mg")
  const strengthMatch = medicineName.match(/(\d+)\s*(mg|g|ml|mcg)/i)
  const strength = strengthMatch ? strengthMatch[0] : ""

  // Extract form from medicine name (tablet, syrup, injection, etc.)
  const formMatch = medicineName.match(/(tablet|syrup|injection|capsule|drops|cream|ointment|gel)/i)
  const form = formMatch ? formMatch[1].toLowerCase() : "tablet"

  // Default dosage based on form
  let defaultDosage = strength || "500 mg"
  if (form === "syrup" || form === "drops") {
    defaultDosage = strength || "5 ml"
  } else if (form === "injection") {
    defaultDosage = strength || "1 ml"
  }

  // Default frequency: Most common is twice daily
  const defaultFrequency = "Twice daily"

  // Default duration: Standard course is 5-7 days
  const defaultDuration = "5 days"

  return {
    dosage: defaultDosage,
    frequency: defaultFrequency,
    duration: defaultDuration,
    source: "default",
  }
}

/**
 * Compute recommendations from medicine document
 */
function computeRecommendations(
  medicineDoc: any,
  medicineName: string
): RecommendationResponse {
  // Try to get explicit defaults first
  if (medicineDoc.defaultDosage && medicineDoc.defaultFrequency && medicineDoc.defaultDuration) {
    return {
      dosage: String(medicineDoc.defaultDosage),
      frequency: String(medicineDoc.defaultFrequency),
      duration: String(medicineDoc.defaultDuration),
      source: "database",
    }
  }

  // Try to compute from available fields
  let dosage = ""
  let frequency = "Twice daily" // Most common default
  let duration = "5 days" // Standard course

  // Dosage: Try defaultDosage, strength, or extract from name
  if (medicineDoc.defaultDosage) {
    dosage = String(medicineDoc.defaultDosage)
  } else if (medicineDoc.strength) {
    dosage = String(medicineDoc.strength)
    // Add form if available
    if (medicineDoc.form) {
      const form = String(medicineDoc.form).toLowerCase()
      if (form === "syrup" || form === "drops") {
        dosage = `${dosage} ml`
      } else if (form === "injection") {
        dosage = `${dosage} ml`
      } else {
        dosage = `${dosage} mg`
      }
    }
  } else {
    // Extract from name
    const strengthMatch = medicineName.match(/(\d+)\s*(mg|g|ml|mcg)/i)
    dosage = strengthMatch ? strengthMatch[0] : "500 mg"
  }

  // Frequency: Try defaultFrequency or use common patterns
  if (medicineDoc.defaultFrequency) {
    frequency = String(medicineDoc.defaultFrequency)
  } else {
    // Common patterns based on medicine type
    const nameLower = medicineName.toLowerCase()
    if (nameLower.includes("antibiotic") || nameLower.includes("amoxicillin") || nameLower.includes("azithromycin")) {
      frequency = "Three times daily"
    } else if (nameLower.includes("pain") || nameLower.includes("paracetamol")) {
      frequency = "As needed"
    } else {
      frequency = "Twice daily"
    }
  }

  // Duration: Try defaultDuration or use common patterns
  if (medicineDoc.defaultDuration) {
    duration = String(medicineDoc.defaultDuration)
  } else {
    const nameLower = medicineName.toLowerCase()
    if (nameLower.includes("antibiotic")) {
      duration = "7 days"
    } else if (nameLower.includes("chronic") || nameLower.includes("maintenance")) {
      duration = "30 days"
    } else {
      duration = "5 days"
    }
  }

  return {
    dosage,
    frequency,
    duration,
    source: "computed",
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const medicineName = searchParams.get("name") || ""

    if (!medicineName) {
      return NextResponse.json(
        { error: "Medicine name is required" },
        { status: 400 }
      )
    }

    const mongoClient = await getMongoClient()
    const db = mongoClient.db(DB_NAME)
    const collection = db.collection(COLLECTION_NAME)

    // Search for medicine by name (case-insensitive)
    const medicineDoc = await collection.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${medicineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        { drugName: { $regex: new RegExp(`^${medicineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        { medicineName: { $regex: new RegExp(`^${medicineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
      ],
    })

    let recommendations: RecommendationResponse

    if (medicineDoc) {
      // Medicine found in database - compute recommendations
      recommendations = computeRecommendations(medicineDoc, medicineName)
    } else {
      // Medicine not found - use rule-based defaults
      recommendations = getDefaultRecommendations(medicineName)
    }

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error("Medicine recommendation error:", error)
    
    // Return safe defaults on error
    const searchParams = request.nextUrl.searchParams
    const medicineName = searchParams.get("name") || ""
    const defaults = getDefaultRecommendations(medicineName)
    
    return NextResponse.json(defaults)
  }
}

// Cleanup connection on process exit
if (typeof process !== "undefined") {
  process.on("SIGINT", async () => {
    if (client) {
      await client.close()
    }
  })
}
