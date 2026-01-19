/**
 * Script to create an index on the medicine name field in MongoDB
 * Run this once to optimize autocomplete performance:
 * 
 * node scripts/create-medicine-index.js
 * 
 * Or run directly in MongoDB shell:
 * use hospital
 * db.rxnorm.createIndex({ name: 1 })
 * db.rxnorm.createIndex({ drugName: 1 })
 * db.rxnorm.createIndex({ medicineName: 1 })
 */

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = 'hospital'
const COLLECTION_NAME = 'rxnorm'

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION_NAME)
    
    // Create indexes on common field names for prefix searches
    console.log('Creating indexes...')
    
    try {
      await collection.createIndex({ name: 1 })
      console.log('✓ Index created on "name" field')
    } catch (err) {
      if (err.code === 85) {
        console.log('✓ Index already exists on "name" field')
      } else {
        console.log('✗ Error creating index on "name":', err.message)
      }
    }
    
    try {
      await collection.createIndex({ drugName: 1 })
      console.log('✓ Index created on "drugName" field')
    } catch (err) {
      if (err.code === 85) {
        console.log('✓ Index already exists on "drugName" field')
      } else {
        console.log('✗ Error creating index on "drugName":', err.message)
      }
    }
    
    try {
      await collection.createIndex({ medicineName: 1 })
      console.log('✓ Index created on "medicineName" field')
    } catch (err) {
      if (err.code === 85) {
        console.log('✓ Index already exists on "medicineName" field')
      } else {
        console.log('✗ Error creating index on "medicineName":', err.message)
      }
    }
    
    // List all indexes
    const indexes = await collection.indexes()
    console.log('\nCurrent indexes:')
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`)
    })
    
    console.log('\n✓ Index creation complete!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('Disconnected from MongoDB')
  }
}

createIndexes()
