# Medicine Autocomplete Setup Guide

This guide explains how to set up the medicine autocomplete feature for the prescription form.

## Prerequisites

1. **MongoDB** must be running on `mongodb://localhost:27017`
2. **Database**: `hospital`
3. **Collection**: `rxnorm`

## Database Setup

### 1. Ensure MongoDB is Running

```bash
# Start MongoDB (varies by OS)
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### 2. Create Indexes for Performance

Run the index creation script:

```bash
node scripts/create-medicine-index.js
```

Or manually in MongoDB shell:

```javascript
use hospital
db.rxnorm.createIndex({ name: 1 })
db.rxnorm.createIndex({ drugName: 1 })
db.rxnorm.createIndex({ medicineName: 1 })
```

### 3. Sample Data Structure

Your `rxnorm` collection documents should have one of these field names for the medicine name:

```javascript
// Option 1: "name" field
{ name: "Paracetamol 500mg Tablet" }

// Option 2: "drugName" field
{ drugName: "Paracetamol 500mg Tablet" }

// Option 3: "medicineName" field
{ medicineName: "Paracetamol 500mg Tablet" }

// Option 4: "displayName" field
{ displayName: "Paracetamol 500mg Tablet" }
```

## API Endpoint

The autocomplete API endpoint is available at:

```
GET /api/medicines/autocomplete?q=<query>
```

**Query Parameters:**
- `q` (required): The search query (minimum 1 character)

**Response:**
```json
{
  "results": [
    "Paracetamol 500mg Tablet",
    "Pantoprazole 40mg Tablet",
    "Amoxicillin 500mg Capsule"
  ]
}
```

## Frontend Usage

The autocomplete component is already integrated into the prescription form at:

`/dashboard/doctor/prescriptions`

When creating a new prescription, the "Medicine Name" field will automatically:
- Show suggestions as you type (after 1 character)
- Debounce input (300ms delay)
- Support keyboard navigation:
  - `↑` / `↓`: Navigate suggestions
  - `Enter`: Select suggestion
  - `Esc`: Close suggestions
- Handle empty results gracefully
- Show loading state while fetching

## Features

✅ **Debounced Search**: 300ms delay to reduce API calls  
✅ **Keyboard Navigation**: Full keyboard support (↑ ↓ Enter Esc)  
✅ **Case-Insensitive**: Prefix-based search  
✅ **Performance**: Uses MongoDB indexes  
✅ **Error Handling**: Graceful error handling  
✅ **Empty State**: Handles no results elegantly  

## Troubleshooting

### No suggestions appearing

1. Check MongoDB connection:
   ```bash
   mongosh mongodb://localhost:27017
   use hospital
   db.rxnorm.countDocuments()
   ```

2. Verify indexes exist:
   ```javascript
   db.rxnorm.getIndexes()
   ```

3. Check browser console for API errors

4. Verify field names match (`name`, `drugName`, `medicineName`, or `displayName`)

### Slow performance

- Ensure indexes are created (run `create-medicine-index.js`)
- Check MongoDB query performance:
  ```javascript
  db.rxnorm.find({ name: /^par/i }).explain("executionStats")
  ```

### API errors

- Check MongoDB is running
- Verify connection string in `.env.local` (if using custom URI)
- Check server logs for detailed error messages

## Environment Variables (Optional)

If your MongoDB URI differs from the default, add to `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017
```
