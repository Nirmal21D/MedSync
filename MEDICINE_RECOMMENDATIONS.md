# Medicine Recommendations System

This document explains the automatic recommendation system for prescription fields (Dosage, Frequency, Duration) when a medicine is selected.

## Overview

When a doctor selects a medicine name from the autocomplete dropdown, the system automatically:
1. Fetches recommendations from the MongoDB `medicine` collection
2. Auto-populates Dosage, Frequency, and Duration fields
3. Visually indicates which fields are system-recommended
4. Allows full manual override by the doctor

## Database Schema

### MongoDB Collection: `medicine`

**Location:** `mongodb://localhost:27017/hospital/medicine`

**Supported Field Names:**
- `name` - Medicine name (primary identifier)
- `drugName` - Alternative name field
- `medicineName` - Alternative name field
- `strength` - Medicine strength (e.g., "500mg", "40mg")
- `form` - Dosage form (e.g., "tablet", "syrup", "injection", "capsule")
- `defaultDosage` - Explicit default dosage (e.g., "500 mg")
- `defaultFrequency` - Explicit default frequency (e.g., "Twice daily")
- `defaultDuration` - Explicit default duration (e.g., "5 days")

### Example Document

```javascript
{
  name: "Paracetamol 500mg Tablet",
  strength: "500mg",
  form: "tablet",
  defaultDosage: "500 mg",
  defaultFrequency: "Twice daily",
  defaultDuration: "5 days"
}
```

## API Endpoint

### `GET /api/medicines/recommendations`

**Query Parameters:**
- `name` (required): Medicine name to get recommendations for

**Response:**
```json
{
  "dosage": "500 mg",
  "frequency": "Twice daily",
  "duration": "5 days",
  "source": "database"
}
```

**Source Values:**
- `"database"` - All three fields found explicitly in database
- `"computed"` - Computed from available fields using rules
- `"default"` - Medicine not found, using rule-based defaults

## Recommendation Logic

### Priority Order

1. **Explicit Defaults** (Highest Priority)
   - If `defaultDosage`, `defaultFrequency`, and `defaultDuration` exist → Use them

2. **Computed from Fields**
   - Extract `strength` and `form` to compute dosage
   - Use medicine type patterns for frequency
   - Use medicine type patterns for duration

3. **Rule-Based Defaults** (Fallback)
   - Extract strength from medicine name (regex: `/(\d+)\s*(mg|g|ml|mcg)/i`)
   - Extract form from medicine name (regex: `/(tablet|syrup|injection|capsule|drops|cream|ointment|gel)/i`)
   - Apply form-specific defaults

### Default Rules

#### Dosage by Form
- **Tablet/Capsule**: `{strength} mg` (default: "500 mg")
- **Syrup/Drops**: `{strength} ml` (default: "5 ml")
- **Injection**: `{strength} ml` (default: "1 ml")
- **Other**: `{strength} mg` (default: "500 mg")

#### Frequency by Medicine Type
- **Antibiotics** (amoxicillin, azithromycin, etc.): "Three times daily"
- **Pain relievers** (paracetamol, etc.): "As needed"
- **Default**: "Twice daily"

#### Duration by Medicine Type
- **Antibiotics**: "7 days"
- **Chronic/Maintenance**: "30 days"
- **Default**: "5 days"

## Frontend Behavior

### Visual Indicators

Recommended fields are highlighted with:
- Blue border (`border-blue-300`)
- Light blue background (`bg-blue-50/50` in light mode, `bg-blue-950/20` in dark mode)
- "(Recommended)" label next to the field label

### User Interaction

1. **Auto-population**: When medicine is selected, fields populate automatically
2. **Manual Override**: Doctor can edit any field - recommendation indicator disappears
3. **No Blocking**: Form submission works even if recommendations fail to load

### Example Flow

```
1. Doctor types "Paracetamol" → Autocomplete shows suggestions
2. Doctor selects "Paracetamol 500mg Tablet" → API called
3. System receives: { dosage: "500 mg", frequency: "Twice daily", duration: "5 days" }
4. Fields auto-populate with blue highlighting
5. Doctor can modify any field → Highlighting removed on edit
6. Form submits normally
```

## Error Handling

### API Errors
- If API fails → Fields remain empty, no blocking
- Error logged to console, user can continue

### Missing Data
- If medicine not found → Rule-based defaults applied
- If partial data → Computed from available fields
- If no data → Safe defaults (500 mg, Twice daily, 5 days)

### Database Connection Issues
- Falls back to rule-based defaults
- Form remains functional

## Testing

### Test Cases

1. **Medicine with explicit defaults**
   ```javascript
   // Database: { name: "Test Drug", defaultDosage: "100mg", defaultFrequency: "Once daily", defaultDuration: "10 days" }
   // Expected: All fields populated with database values, source: "database"
   ```

2. **Medicine with computed values**
   ```javascript
   // Database: { name: "Test Drug", strength: "250mg", form: "tablet" }
   // Expected: Dosage computed, frequency/duration from rules, source: "computed"
   ```

3. **Medicine not in database**
   ```javascript
   // Database: No match
   // Expected: Rule-based defaults from name parsing, source: "default"
   ```

4. **Manual override**
   ```javascript
   // User edits recommended field
   // Expected: Recommendation indicator removed, field editable
   ```

## Setup Instructions

1. **Ensure MongoDB is running**
   ```bash
   mongosh mongodb://localhost:27017
   ```

2. **Create medicine collection with sample data**
   ```javascript
   use hospital
   db.medicine.insertMany([
     {
       name: "Paracetamol 500mg Tablet",
       strength: "500mg",
       form: "tablet",
       defaultDosage: "500 mg",
       defaultFrequency: "Twice daily",
       defaultDuration: "5 days"
     },
     {
       name: "Amoxicillin 500mg Capsule",
       strength: "500mg",
       form: "capsule",
       defaultDosage: "500 mg",
       defaultFrequency: "Three times daily",
       defaultDuration: "7 days"
     }
   ])
   ```

3. **Create indexes for performance** (optional)
   ```javascript
   db.medicine.createIndex({ name: 1 })
   db.medicine.createIndex({ drugName: 1 })
   db.medicine.createIndex({ medicineName: 1 })
   ```

## Constraints & Assumptions

✅ **No ML/External APIs**: Pure rule-based logic  
✅ **Non-blocking**: Form works even if recommendations fail  
✅ **Safe defaults**: Always provides reasonable defaults  
✅ **Manual override**: Doctor has full control  
✅ **Incomplete data handling**: Gracefully handles missing fields  

## Future Enhancements

Potential improvements (not implemented):
- Caching recommendations for frequently used medicines
- Learning from doctor's manual overrides
- Integration with drug interaction databases
- Patient-specific dosage adjustments
