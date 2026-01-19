import { NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = "hospital"
const COLLECTION_NAME = "rxnorm"

// Cache MongoDB client connection
let client: MongoClient | null = null

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
  }
  return client
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""

    // Return empty if query is too short
    if (query.length < 1) {
      return NextResponse.json({ results: [] })
    }

    const mongoClient = await getMongoClient()
    const db = mongoClient.db(DB_NAME)
    const collection = db.collection(COLLECTION_NAME)

    // Case-insensitive prefix search
    // Try common field names: name, drugName, medicineName
    const searchRegex = new RegExp(`^${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i")
    
    // Build query with multiple possible field names
    const searchQuery: any = {
      $or: [
        { name: searchRegex },
        { drugName: searchRegex },
        { medicineName: searchRegex },
        { displayName: searchRegex },
      ],
    }
    
    const results = await collection
      .find(searchQuery)
      .limit(10)
      .toArray()

    // Extract medicine names from results
    const medicineNames = results
      .map((doc) => {
        // Try different possible field names
        return doc.name || doc.drugName || doc.medicineName || doc.displayName || null
      })
      .filter((name): name is string => name !== null && typeof name === "string")
      .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
      .slice(0, 10)

    return NextResponse.json({ results: medicineNames })
  } catch (error) {
    console.error("Medicine autocomplete error:", error)
    return NextResponse.json(
      { error: "Failed to fetch medicine suggestions", results: [] },
      { status: 500 }
    )
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
