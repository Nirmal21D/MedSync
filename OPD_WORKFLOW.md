# 🏥 MedSync OPD Management - Complete Workflow v2.1

## Overview
MedSync features a **realistic end-to-end OPD (Outpatient Department) management system** that handles real-world scenarios including patients leaving after consultation, optional pharmacy/lab services, and immediate billing.

---

## 🔄 IMPROVED Complete Patient Journey

### 1️⃣ APPOINTMENT BOOKING (No Change)

#### **Option A: Voice Booking (Patients)**
- **Location**: Home page or patient dashboard
- **Technology**: Web Speech API (Chrome/Edge)
- **Process**:
  1. Patient clicks "Voice Booking"
  2. System asks for date (natural language: "tomorrow", "25th January")
  3. System asks for time slot ("10 AM", "2:30 PM")
  4. Patient describes symptoms
  5. System auto-assigns available doctor
  6. Booking confirmed with queue number

#### **Option B: OPD Management (Receptionist)**
- **Location**: `/dashboard/receptionist/opd-management`
- **Features**:
  - Search patient by UHID/Name/Phone
  - Add new patient inline
  - Select doctor and date
  - Choose time slot from grid
  - Enter symptoms and notes
  - Instant booking confirmation
- **View Modes**:
  - Today's appointments
  - All appointments (across all dates)

#### **Option C: Self-Service Booking (Patients)**
- **Location**: `/dashboard/patient/appointments/book`
- **Features**: Calendar-based selection with doctor availability

**Output**: Appointment created with status: `scheduled`

---

### 2️⃣ CONSULTATION (Doctor) - **CRITICAL CHANGES**

**Location**: `/dashboard/doctor/appointments`

**NEW Doctor Workflow**:
1. View today's queue
2. **Click "Start Consultation"** → Status: `in-progress`
3. Conduct consultation
4. **Optional**: Create prescription (linked to appointment)
5. **Optional**: Add lab test recommendations
6. Add consultation notes (required)
7. **Click "Complete & Bill"** → Opens completion dialog

**🔔 COMPLETION DIALOG (New)**:
- **Required**: Consultation notes/diagnosis
- Shows: Prescription status (created or not)
- Shows: What happens next
- **Critical**: Bill generated IMMEDIATELY on confirmation

**What Happens on "Complete & Bill"**:
- ✅ Appointment marked `completed`
- ✅ **Bill generated instantly** with consultation fee only
- ✅ Bill ID linked to appointment
- ✅ Prescription (if any) linked to appointment
- ✅ **Patient MUST pay before leaving OPD**
- ✅ Toast: "Bill generated, patient must pay before leaving"

**Edge Case Handled**: Patient cannot leave without paying because:
- Bill is generated while still in doctor's room
- Receptionist/security checks bill payment before exit
- System tracks unpaid bills prominently

---

### ❌ 2️⃣ CHECK-IN (REMOVED)

**Previous Flow**: Receptionist confirms appointment  
**Problem**: Unnecessary bottleneck, adds manual work  
**Solution**: **REMOVED ENTIRELY** - Doctor starts consultation directly

---

### 3️⃣ PRESCRIPTION VISIBILITY (New Feature)

**Patient Dashboard**: `/dashboard/patient/my-appointments`

**Patient Can See**:
- All appointments (upcoming, completed)
- **Prescriptions linked to completed appointments**
- Consultation notes from doctor
- Download prescription option
- **Choice**: Buy from hospital or outside

**Prescription Details Shown**:
- Medicines with dosage, frequency, duration
- Recommended lab tests (if any)
- Doctor's notes
- Date prescribed

---

### 4️⃣ BILLING & PAYMENT (Immediate)

**When**: Immediately after doctor marks consultation complete  
**Where**: Patient directed to billing counter before leaving OPD

**Mandatory Consultation Bill**:
- Generated automatically by doctor
- Contains: Consultation fee only (₹500-₹1200)
- Status: `pending`
- **Must be paid before patient exits**

**Receptionist Actions**:
1. Search patient by UHID
2. View pending consultation bill
3. **Optional**: Apply discount
4. Collect payment (cash/card/UPI/insurance)
5. Mark bill as `paid`
6. Patient can now leave

---

### 5️⃣ PHARMACY (OPTIONAL - Patient Choice)

**Location**: `/dashboard/pharmacist/prescriptions`

**Patient Has Two Options**:

**Option A: Buy from Hospital Pharmacy**
1. Patient presents prescription to pharmacist
2. Pharmacist searches by UHID/appointment
3. Reviews prescription
4. Checks inventory
5. Dispenses medicines
6. **Medicine charges added to patient's bill** (new bill or existing)
7. Patient pays for medicines

**Option B: Buy from Outside**
1. Patient downloads prescription from dashboard
2. Goes to external pharmacy
3. No hospital charges
4. Hospital only gets consultation fee

**System Behavior**:
- Prescription marked `dispensedFromHospital: true/false`
- Only charges if dispensed from hospital
- No forced pharmacy purchase

---

### 6️⃣ LAB TESTS (OPTIONAL - Patient Choice)

**Location**: `/dashboard/lab-staff/lab-orders`

**Patient Has Two Options**:

**Option A: Hospital Lab**
1. Doctor recommends tests in prescription
2. Patient goes to hospital lab
3. Sample collected
4. Tests performed
5. **Lab charges added to bill**
6. Results visible in patient dashboard

**Option B: External Lab**
1. Patient takes prescription
2. Gets tests done elsewhere
3. Brings results to next appointment
4. No hospital charges

---

### 7️⃣ POST-VISIT

**Mandatory**:
- ✅ Consultation bill paid
- ✅ Patient can leave hospital

**Optional** (if used hospital services):
- Pharmacy bill paid (if medicines bought)
- Lab bill paid (if tests done)

**Patient Dashboard Updated**:
- Appointment marked completed
- Prescription visible and downloadable
- Bill history updated
- Consultation notes visible

---

## 🎯 Key Improvements from v1.0

### **Problems Fixed**:

❌ **Old**: Receptionist confirmation bottleneck  
✅ **New**: Doctor starts consultation directly

❌ **Old**: Bill generated at undefined time  
✅ **New**: Bill generated INSTANTLY when doctor marks complete

❌ **Old**: Patient could leave without paying  
✅ **New**: Bill created before patient leaves doctor's room

❌ **Old**: Prescriptions not visible to patients  
✅ **New**: Linked to appointments, visible in patient dashboard

❌ **Old**: Forced pharmacy/lab usage  
✅ **New**: Optional - patient can choose hospital or outside

❌ **Old**: Complex multi-step billing  
✅ **New**: Immediate consultation billing, optional services billed separately

---

## 💰 Billing Structure (Updated)

### **Primary Bill: Consultation (Mandatory)**
Generated by doctor when marking consultation complete:
```typescript
{
  billNumber: "BILL-20260118-0001",
  items: [
    {
      serviceName: "General Consultation",
      serviceType: "consultation",
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500,
      linkedTo: { type: "appointment", id: "APT-12345" }
    }
  ],
  total: 500,
  status: "pending",
  appointmentId: "APT-12345"
}
```

### **Secondary Bills: Services (Optional)**
Created only if patient uses hospital pharmacy/lab:

**Pharmacy Bill** (if patient buys from hospital):
```typescript
{
  billNumber: "BILL-20260118-0002",
  items: [
    {
      serviceName: "Medicine: Paracetamol 500mg",
      quantity: 10,
      unitPrice: 5,
      total: 50
    }
  ],
  total: 150,
  prescriptionId: "RX-12345"
}
```

**Lab Bill** (if patient uses hospital lab):
```typescript
{
  billNumber: "BILL-20260118-0003",
  items: [
    { serviceName: "CBC Test", unitPrice: 500, total: 500 }
  ],
  total: 500
}
```

---

## 🔐 Updated Role-Based Access

### **Doctor** (Enhanced)
- ✅ View appointment queue
- ✅ **Start consultation** (marks in-progress)
- ✅ Conduct consultation
- ✅ Create prescriptions **linked to appointments**
- ✅ Add lab test recommendations
- ✅ **Complete & generate bill immediately**
- ✅ **No receptionist confirmation needed**

### **Patient** (Enhanced)
- ✅ Book appointments
- ✅ View upcoming appointments
- ✅ **View prescriptions for completed appointments**
- ✅ **Download prescriptions**
- ✅ **Choose hospital or outside pharmacy/lab**
- ✅ View consultation notes
- ✅ View bills and payment history

### **Receptionist** (Simplified)
- ✅ Book appointments (for walk-ins)
- ✅ View all appointments
- ✅ **Collect consultation payments** (mandatory)
- ✅ **Collect pharmacy/lab payments** (if applicable)
- ✅ **No confirmation step needed**

### **Pharmacist**
- ✅ View prescriptions
- ✅ Dispense medicines (if patient chooses hospital)
- ✅ Update inventory
- ✅ **Bill only if patient buys from hospital**

### **Lab Staff**
- ✅ View lab orders
- ✅ Collect samples (if patient chooses hospital)
- ✅ Enter results
- ✅ **Bill only if patient uses hospital lab**

---

## 📊 System Features (Updated)

### **Immediate Billing**
- Bill generated while patient still with doctor
- No chance for patient to leave without paying
- Receptionist sees pending bill immediately
- Payment required before exit

### **Prescription Linking**
- Prescriptions linked to appointments
- Visible in patient dashboard
- Downloadable for external use
- Tracks if dispensed from hospital

### **Optional Services**
- Pharmacy not mandatory
- Lab tests not mandatory
- Patient freedom to choose
- Hospital only charges for services used

### **Edge Case Handling**
- Patient runs away: Bill already generated, tracked as unpaid
- Prescription lost: Patient can download from dashboard
- External pharmacy: Prescription available digitally
- Follow-up needed: Previous consultation notes visible

---

## 💡 Updated Usage Example

### **Complete Realistic Flow**

**8:00 AM** - Patient books appointment via voice
```
Patient: "Tomorrow at 10 AM"
System: "Appointment confirmed. Queue #5"
```

**10:00 AM** - Patient arrives at hospital
```
Patient: Waits in queue
Doctor: Calls patient (Queue #5)
```

**10:05 AM** - Doctor consultation
```
Doctor: Clicks "Start Consultation" (status: in-progress)
Doctor: Examines patient
Doctor: Creates prescription:
  - Paracetamol 500mg (10 tablets)
  - Cough syrup
  - Recommends: CBC blood test
Doctor: Adds consultation notes: "Viral fever, rest advised"
Doctor: Clicks "Complete & Bill"
```

**10:15 AM** - Completion Dialog
```
Dialog Shows:
  - Consultation notes: "Viral fever, rest advised"
  - Prescription: Created ✓
  - Bill will be generated: ₹500
  - Patient must pay before leaving
Doctor: Confirms "Complete & Generate Bill"
System: ✅ Bill BILL-20260118-0023 generated
System: ✅ Prescription linked to appointment
Toast: "Patient must pay ₹500 before leaving"
```

**10:20 AM** - Patient to Billing Counter
```
Receptionist: Searches patient UHID
Receptionist: Sees pending bill ₹500
Receptionist: Collects ₹500 cash
System: ✅ Bill marked "paid"
Receptionist: "You can leave now. Check your dashboard for prescription"
```

**10:25 AM** - Patient's Choice
```
Option 1: Hospital Pharmacy
  → Patient goes to pharmacy
  → Shows prescription (or UHID)
  → Buys medicines (₹150)
  → Pays at pharmacy counter

Option 2: External Pharmacy
  → Patient leaves hospital
  → Opens patient dashboard on phone
  → Downloads prescription
  → Buys from nearby chemist
  → Hospital charges only ₹500 (consultation)

Option 3: Lab Tests
  → If hospital: Sample collected, billed separately
  → If external: Takes prescription to outside lab
```

---

## 🚨 Edge Cases Handled

### **Patient Runs Away After Consultation**
- ❌ Old: No bill generated yet, revenue lost
- ✅ New: Bill already generated, shows as unpaid, tracked in system

### **Patient Loses Prescription**
- ❌ Old: Need to contact doctor again
- ✅ New: Download from patient dashboard anytime

### **Patient Wants External Pharmacy**
- ❌ Old: Forced to buy from hospital
- ✅ New: Download prescription, buy anywhere

### **Receptionist Busy/Unavailable**
- ❌ Old: Appointments pile up waiting for confirmation
- ✅ New: Doctor starts consultations directly

### **Patient Disputes Charges**
- ❌ Old: Unclear what services were provided
- ✅ New: Itemized bill with appointment linkage, prescription linked

---

## 🔧 Technical Changes

### **New Fields in Appointment**
```typescript
{
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "no-show"
  // Removed: "confirmed"
  consultationStartTime?: Date
  consultationEndTime?: Date
  consultationNotes?: string // Required for completion
  prescriptionId?: string // Link to prescription
  billId?: string // Link to generated bill
}
```

### **New Fields in Prescription**
```typescript
{
  appointmentId?: string // Link back to appointment
  patientUhid: string // For easier patient search
  labTests?: string[] // Recommended lab tests
  dispensedFromHospital?: boolean // Track if bought from hospital
}
```

### **Billing Logic**
1. **Consultation Bill**: Generated by doctor, mandatory
2. **Pharmacy Bill**: Generated by pharmacist, only if dispensed
3. **Lab Bill**: Generated by lab staff, only if tests done

---

## 🎯 Key Advantages of v2.1

1. **Immediate Billing**: No revenue leakage
2. **Patient Freedom**: Choose hospital or external services
3. **No Bottlenecks**: Doctor handles end-to-end
4. **Digital Prescriptions**: Always accessible
5. **Edge Case Proof**: Handles patient leaving, lost prescription, etc.
6. **Realistic Workflow**: Matches real hospital operations
7. **Optional Services**: Pharmacy/lab not forced

---

**Last Updated**: January 18, 2026  
**Version**: 2.1.0  
**Status**: ✅ Production Ready

**Location**: `/dashboard/doctor/appointments`

**Doctor Workflow**:
1. View today's queue
2. Call patient by queue number
3. Conduct consultation
4. **Optional**: Create prescription
5. **Optional**: Order lab tests
6. Add consultation notes
7. **Mark as `completed`**

**🔔 AUTOMATIC BILLING TRIGGER**:
When doctor marks appointment as "completed":
- ✅ System **automatically generates bill**
- ✅ Adds consultation fee (₹500-₹1200 based on specialty)
- ✅ Creates bill number (e.g., `BILL-20260118-0001`)
- ✅ Bill status: `pending`
- ✅ Toast notification: "Bill generated, patient can proceed to billing"

---

### 4️⃣ PHARMACY (If Prescribed)

**Location**: `/dashboard/pharmacist/prescriptions`

**Pharmacist Workflow**:
1. Patient presents prescription
2. Pharmacist searches by UHID
3. Reviews prescription
4. Checks inventory availability
5. Approves prescription
6. Dispenses medicines
7. **Medicine charges automatically added to patient's bill**

---

### 5️⃣ LAB (If Tests Ordered)

**Location**: `/dashboard/lab-staff/lab-orders`

**Lab Workflow**:
1. Patient arrives for tests
2. Sample collection marked
3. Tests performed
4. Results entered
5. **Lab charges automatically added to patient's bill**

---

### 6️⃣ BILLING & CHECKOUT (Reception)

**Location**: `/dashboard/receptionist/billing`

#### **Receptionist Actions**:

**A. View Pending Bills**
- Filter by patient name, UHID, bill number
- See pending/paid status
- View bill details

**B. Review Bill**
- Consultation fee: ₹500-₹1200
- Pharmacy charges (if medicines dispensed)
- Lab test charges (if tests done)
- Any additional services

**C. Apply Discounts (Optional)**
- Enter discount amount
- Provide reason (e.g., "Senior citizen", "Insurance coverage")
- Updated total calculated

**D. Collect Payment**
Payment methods supported:
1. **Cash**:
   - Enter received amount
   - System calculates change
   
2. **Card/UPI**:
   - Enter transaction ID
   - ⚠️ Payment gateway integration placeholder provided
   
3. **Insurance**:
   - Enter insurance provider
   - Enter claim number
   - Mark as paid (claim processed separately)

**E. Confirm Payment**
- Bill status: `paid`
- Payment timestamp recorded
- Receipt ready for print/download

---

### 7️⃣ POST-VISIT

**Automatic Actions**:
- ✅ Bill marked paid
- ✅ Payment recorded in system
- ✅ Revenue analytics updated
- ✅ Patient history updated

**Manual Actions**:
- 📄 Print receipt (placeholder)
- 📧 Email/SMS receipt (placeholder)
- 📅 Schedule follow-up appointment (if needed)

---

## 💰 Billing Details

### **Service Pricing**

#### Consultation Fees
- General Consultation: **₹500**
- Specialist Consultation: **₹800**
- Emergency Consultation: **₹1200**
- Follow-up Consultation: **₹300**

#### Common Procedures
- ECG: **₹300**
- X-Ray: **₹600**
- Blood Pressure Check: **₹50**
- Wound Dressing: **₹200**

#### Lab Tests
- Blood Test: **₹400**
- Urine Test: **₹200**
- CBC Test: **₹500**
- Liver Function: **₹800**

#### Documents
- Medical Certificate: **₹100**
- Prescription Copy: **₹50**
- Report Copy: **₹50**

### **Bill Structure**

```typescript
{
  billNumber: "BILL-20260118-0001",
  patientName: "John Doe",
  patientUhid: "UHID-202601-00001",
  items: [
    {
      serviceName: "General Consultation",
      serviceType: "consultation",
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500
    },
    {
      serviceName: "Medicine: Paracetamol 500mg",
      serviceType: "pharmacy",
      quantity: 10,
      unitPrice: 5,
      totalPrice: 50
    }
  ],
  subtotal: 550,
  discount: 50, // Senior citizen discount
  tax: 0, // No tax on medical services
  total: 500,
  status: "paid",
  paymentMethod: "cash"
}
```

---

## 🔐 Role-Based Access

### **Receptionist**
- ✅ Book appointments
- ✅ View all appointments
- ✅ Generate bills
- ✅ Collect payments
- ✅ Apply discounts
- ✅ Print receipts

### **Doctor**
- ✅ View appointment queue
- ✅ Conduct consultations
- ✅ Create prescriptions
- ✅ Order lab tests
- ✅ Mark appointments complete (triggers billing)

### **Pharmacist**
- ✅ View prescriptions
- ✅ Approve/reject prescriptions
- ✅ Dispense medicines
- ✅ Update inventory

### **Lab Staff**
- ✅ View lab orders
- ✅ Mark sample collection
- ✅ Enter test results
- ✅ Complete orders

### **Admin**
- ✅ All of the above
- ✅ View revenue reports
- ✅ Manage staff
- ✅ Configure pricing

---

## 📊 System Features

### **Automatic Bill Generation**
- Triggered when appointment marked "completed"
- Calculates consultation fee based on specialty
- Links to appointment for reference
- Creates unique bill number

### **Consolidated Billing**
- Single bill per visit
- Includes consultation + pharmacy + lab
- Real-time price calculation
- Discount support

### **Payment Processing**
- Multiple payment methods
- Transaction tracking
- Change calculation (for cash)
- Insurance claim support

### **Revenue Tracking**
- Total bills count
- Pending vs paid bills
- Total revenue
- Pending amount
- Daily/monthly reports

---

## 🚀 Implementation Status

### ✅ **COMPLETED**
- [x] Appointment booking (3 methods)
- [x] Queue management
- [x] Doctor consultation workflow
- [x] Prescription management
- [x] Lab order management
- [x] **Automatic bill generation**
- [x] **Billing & checkout interface**
- [x] **Payment collection (placeholder)**
- [x] Bill status tracking
- [x] Discount application

### ⚠️ **PLACEHOLDERS (For Future Integration)**
- [ ] Payment gateway (Razorpay/Stripe)
- [ ] Receipt printing (thermal printer)
- [ ] SMS/Email notifications
- [ ] Insurance claim processing
- [ ] Advanced reporting & analytics

---

## 💡 Usage Example

### **Complete Patient Flow**

**8:00 AM** - Patient books appointment via voice
```
Patient: "Tomorrow at 10 AM"
System: "Available slot found. Symptoms?"
Patient: "Chest pain and cough"
System: "Appointment confirmed with Dr. Smith. Queue #5"
```

**10:00 AM** - Patient arrives at hospital
```
Receptionist: Marks appointment as "confirmed"
Patient: Waits in queue
```

**10:15 AM** - Doctor consultation
```
Doctor: Examines patient
Doctor: Creates prescription (Paracetamol + Cough syrup)
Doctor: Orders blood test (CBC)
Doctor: Marks appointment "completed"
System: ✅ Bill generated automatically (BILL-20260118-0023)
```

**10:30 AM** - Pharmacy
```
Pharmacist: Reviews prescription
Pharmacist: Dispenses medicines
System: ✅ Medicine charges added to bill
```

**10:45 AM** - Lab
```
Lab Staff: Collects blood sample
Lab Staff: Marks sample collected
System: ✅ Lab test charge added to bill
```

**11:00 AM** - Billing Counter
```
Receptionist: Searches patient UHID
Receptionist: Reviews bill
  - Consultation: ₹500
  - Medicines: ₹150
  - CBC Test: ₹500
  - Total: ₹1150
Receptionist: Applies 10% senior citizen discount
  - Discount: ₹115
  - Final Total: ₹1035
Receptionist: Collects ₹1100 cash
  - Change: ₹65
System: ✅ Bill marked "paid"
System: ✅ Ready to print receipt
```

---

## 🎯 Key Advantages

1. **Automated Workflow**: Bill auto-generated on consultation completion
2. **Single Source of Truth**: One consolidated bill per visit
3. **Real-time Tracking**: See pending bills instantly
4. **Multiple Payment Methods**: Cash, Card, UPI, Insurance
5. **Revenue Integrity**: No missed billing opportunities
6. **Audit Trail**: Complete payment history
7. **User-Friendly**: Intuitive interfaces for all roles

---

## 🔧 Technical Details

### **Files Created/Modified**

#### New Files:
1. `lib/billing-utils.ts` - Core billing logic
2. `app/dashboard/[role]/billing/page.tsx` - Billing interface

#### Modified Files:
1. `app/dashboard/[role]/appointments/page.tsx` - Auto-billing on complete
2. `app/dashboard/[role]/opd-management/page.tsx` - Bill action buttons
3. `components/layout/dashboard-layout.tsx` - Added billing navigation

### **Database Collections**

```typescript
// New collection: bills
{
  billNumber: string
  patientId: string
  patientUhid: string
  appointmentId: string
  items: BillItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  status: "pending" | "paid"
  paymentMethod: "cash" | "card" | "upi" | "insurance"
  createdAt: Date
  paidAt: Date
}
```

---

## 📞 Support

For questions or issues with the OPD workflow, contact the development team.

**Status**: ✅ Production Ready (except payment gateway integration)

---

**Last Updated**: January 18, 2026
**Version**: 2.0.0
