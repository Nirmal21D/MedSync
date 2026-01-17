# 🏥 MedSync - Complete Hospital Information System

## ✅ **IMPLEMENTED FEATURES**

### **1. Patient Role & Portal** ✓
- **Patient Dashboard**: Personalized view with UHID, appointments, lab orders, prescriptions
- **Appointment Booking**: 
  - Calendar-based interface
  - Department and doctor selection
  - Available time slots (9 AM - 5 PM, 30-min intervals)
  - Priority selection (routine/urgent/emergency)
  - Queue number assignment
  - Voice booking button (placeholder for LiveKit integration)
- **My Appointments**: View upcoming/past appointments with cancellation
- **Lab Reports**: View test results
- **Prescriptions**: View medication history
- **Demo Credentials**: `patient@gmail.com` / `1234567890`

### **2. UHID System (Barcode)** ✓
- **Auto-Generation**: Format `UHID-YYYYMM-XXXXX` (e.g., UHID-202501-00123)
- **Barcode Creation**: SVG barcode for patient cards
- **Scanner Component**: 
  - Listens for barcode scanner input
  - Manual entry fallback
  - Real-time patient lookup
- **Search Integration**: Search patients by UHID across all pages
- **Validation**: Format checking and error handling

### **3. Appointment System** ✓
- **Calendar UI**: Interactive date picker
- **Time Slot Management**: 
  - Generate slots based on doctor availability
  - 30-minute intervals
  - Real-time availability checking
- **Queue Management**: 
  - Automatic queue number generation
  - Estimated wait time calculation
  - Queue position tracking
- **Departments**: 10 departments (Cardiology, Neurology, Orthopedics, etc.)
- **Status Tracking**: pending → confirmed → in-progress → completed

### **4. Lab Module** ✓
- **Test Catalog**: 10 common tests with pricing:
  - CBC (₹400), LFT (₹800), KFT (₹700)
  - Lipid Profile, HbA1c, Thyroid, Urine, X-Ray, ECG, Culture
- **Order Creation**:
  - Multi-select test selection
  - Priority levels (routine/urgent/STAT)
  - Clinical notes attachment
  - Real-time total calculation
- **Order Tracking**: Search by patient/UHID/order ID
- **Billing Integration**: Auto-flag for billing when completed
- **Status Workflow**: pending → collected → in-progress → completed

### **5. Voice Booking UI** ✓
- **Voice Button**: In appointment booking page
- **Voice Dialog**: Modal with microphone icon and placeholder
- **Integration Ready**: Prepared for LiveKit voice SDK
- **Voice Indicator**: Shows "📞 Voice" badge in appointment list

### **6. Notification System** ✓
- **Notification Bell**: Real-time unread count badge
- **Notification Center**: Dropdown with scrollable list
- **Real-time Listeners**: Firestore `onSnapshot` for instant updates
- **Categories**:
  - 🚨 Critical Patient Alerts
  - ⚠️ Low Inventory Warnings
  - 💰 Unbilled Services
  - 📅 New Appointments
  - 🧪 Lab Results Ready
  - 💊 Pending Prescriptions
- **Actions**: Mark as read, view all, navigate to source
- **Demo Notifications**: 5 sample notifications for demonstration

### **7. Revenue Integrity Dashboard** ✓
- **Zero Revenue Leakage™**: Detect all unbilled services
- **Key Metrics**:
  - Total expected revenue
  - Captured revenue
  - Unbilled amount
  - Leakage percentage
- **Unbilled Services Detection**:
  - Completed appointments without bills
  - Completed lab orders without bills
  - Dispensed prescriptions without bills
- **Alerts**: Critical alert when unbilled services detected
- **Auto-Billing Recommendations**: Service catalog with standard pricing
- **Admin Access Only**: Security protection for financial data

### **8. Utility Libraries** ✓
#### **lib/uhid.ts**
- `generateUHID()`: Creates unique hospital IDs
- `isValidUHID()`: Validates UHID format
- `generateBarcodeDataURL()`: Creates SVG barcode
- `parseBarcodeToUHID()`: Parses scanner input

#### **lib/appointments.ts**
- `generateTimeSlots()`: Creates time slot array
- `isSlotAvailable()`: Checks availability
- `getNextQueueNumber()`: Manages queue
- `getDepartments()`: Returns department list

#### **lib/billing.ts**
- `standardServices[]`: 12 predefined services with pricing
- `createBillingItem()`: Generate bill record
- `detectUnbilledServices()`: Find revenue leaks
- `calculateUnbilledAmount()`: Total unbilled amount
- `formatCurrency()`: INR formatting

---

## 🎨 **TECH STACK**
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript, Tailwind CSS
- **Components**: Radix UI, shadcn/ui
- **Database**: Firebase Firestore (real-time)
- **Authentication**: Firebase Auth
- **AI**: Google Gemini 2.5 Pro
- **Charts**: Recharts
- **Exports**: jsPDF, xlsx
- **Animations**: Framer Motion

---

## 🚀 **GETTING STARTED**

### **1. Install Dependencies**
```bash
pnpm install
```

### **2. Configure Environment**
Create `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

### **3. Run Development Server**
```bash
pnpm dev
```
Navigate to `http://localhost:3000`

---

## 👥 **DEMO CREDENTIALS**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | 1234567890 |
| Doctor | doctor@gmail.com | 1234567890 |
| Nurse | nurse@gmail.com | 1234567890 |
| Pharmacist | pharmacist@gmail.com | 1234567890 |
| Receptionist | receptionist@gmail.com | 1234567890 |
| **Patient** | **patient@gmail.com** | **1234567890** |

---

## 📋 **FEATURE ROADMAP**

### **Completed** ✅
- [x] Patient role and dashboard
- [x] UHID generation and barcode system
- [x] Appointment scheduling with calendar
- [x] Lab module with test orders
- [x] Voice booking UI placeholder
- [x] Notification system with real-time alerts
- [x] Revenue integrity dashboard

### **Integration Tasks** 🔄
- [ ] Connect notification triggers to actions (e.g., low inventory → create notification)
- [ ] Integrate voice SDK (LiveKit) for actual voice booking
- [ ] Add lab technician interface for test result entry
- [ ] Connect inventory dispensing to auto-billing
- [ ] Add report generation for revenue leakage

### **Future Enhancements** 📝
- [ ] Multi-language support (Hindi, regional languages)
- [ ] SMS/Email notifications
- [ ] Payment gateway integration
- [ ] Insurance claim processing
- [ ] Advanced analytics with predictive models
- [ ] Telemedicine video consultations
- [ ] Mobile app (React Native)

---

## 🏗️ **PROJECT STRUCTURE**

```
app/
├── dashboard/
│   ├── [role]/               # Dynamic role-based routes
│   │   ├── page.tsx          # Dashboard switcher
│   │   ├── appointments/     # Appointment management
│   │   ├── patients/         # Patient management
│   │   ├── lab-orders/       # Lab order creation & tracking
│   │   ├── revenue-integrity/# Revenue leakage dashboard
│   │   └── ...
│   ├── patient/              # Patient portal routes
│   │   ├── appointments/
│   │   │   ├── book/         # Appointment booking
│   │   │   └── page.tsx      # My appointments
│   │   └── ...
│   └── login/                # Authentication
│
components/
├── dashboards/               # Role-specific dashboards
│   ├── patient-dashboard.tsx
│   ├── doctor-dashboard.tsx
│   └── ...
├── notifications/
│   └── notification-center.tsx  # Real-time notification bell
├── ui/                       # shadcn/ui components
│   ├── uhid-scanner.tsx      # Barcode scanner
│   └── ...
└── layout/
    └── dashboard-layout.tsx  # Main layout with navigation

lib/
├── types.ts                  # TypeScript interfaces
├── uhid.ts                   # UHID generation & barcode
├── appointments.ts           # Appointment utilities
├── billing.ts                # Revenue integrity functions
├── firebase.ts               # Firebase configuration
└── gemini.ts                 # AI integration
```

---

## 🔒 **SECURITY FEATURES**
- **Role-based Access Control**: Each dashboard restricted by user role
- **Firebase Authentication**: Secure login with email/password
- **Firestore Security Rules**: Database-level permissions
- **Protected Routes**: Redirect unauthenticated users
- **Admin-only Pages**: Revenue integrity restricted to admins

---

## 🎯 **KEY HIGHLIGHTS**

### **Zero Revenue Leakage™**
- Automatically detect services performed but not billed
- Real-time alerts for unbilled consultations, labs, medicines
- Track revenue capture rate with target <5% leakage
- Generate bills automatically on service completion

### **Smart Queue Management**
- Estimated wait time calculation
- Queue position tracking
- Priority handling for emergencies
- Doctor availability-based slot generation

### **Comprehensive Patient Portal**
- View UHID and barcode
- Book appointments with voice option
- Track lab orders and results
- View prescriptions and medicines
- Monitor queue status in real-time

### **Real-time Notifications**
- Critical patient alerts (vital signs)
- Low inventory warnings
- Unbilled service alerts
- New appointment notifications
- Lab results ready alerts

---

## 📊 **DATA MODELS**

### **Patient**
```typescript
{
  id: string
  uhid: string                  // UHID-202501-00123
  name: string
  age: number
  gender: string
  contact: string
  email?: string
  address: string
  bloodGroup: string
  allergies: string[]
  medicalHistory: string[]
  appointments?: string[]       // Array of appointment IDs
  labOrders?: string[]          // Array of lab order IDs
  prescriptions?: string[]      // Array of prescription IDs
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  admittedOn?: Date
  assignedBed?: string
}
```

### **Appointment**
```typescript
{
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  department: string
  appointmentDate: Date
  timeSlot: string              // "09:00 AM"
  queueNumber: number
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  priority: 'routine' | 'urgent' | 'emergency'
  reason: string
  voiceBooked?: boolean         // Voice booking indicator
  createdAt: Date
  consultationStartTime?: Date
  consultationEndTime?: Date
}
```

### **LabOrder**
```typescript
{
  id: string
  patientId: string
  patientName: string
  patientUHID: string
  orderedBy: string             // Doctor name
  orderedByEmail: string
  orderedAt: Date
  tests: LabTest[]
  priority: 'routine' | 'urgent' | 'stat'
  clinicalNotes?: string
  status: 'pending' | 'collected' | 'in-progress' | 'completed'
  totalAmount: number
  billGenerated: boolean        // Revenue integrity flag
  collectedAt?: Date
  completedAt?: Date
  technicianName?: string
}
```

### **Notification**
```typescript
{
  id: string
  recipientEmail: string
  type: 'critical' | 'warning' | 'info' | 'success'
  category: 'patient' | 'inventory' | 'billing' | 'appointment' | 'lab' | 'prescription'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  metadata?: Record<string, any>
}
```

---

## 🧪 **TESTING GUIDE**

### **Patient Journey Test**
1. **Registration**:
   - Login as receptionist
   - Add new patient → Auto-generates UHID (e.g., UHID-202501-00456)
   - Verify barcode displays correctly

2. **Appointment Booking**:
   - Login as patient (`patient@gmail.com`)
   - Book appointment → Select Cardiology → Choose doctor → Pick date/time
   - Click voice booking button → See voice dialog
   - Verify queue number assigned

3. **Consultation**:
   - Login as doctor
   - View appointment in queue
   - Mark appointment as completed
   - Create lab order for patient

4. **Lab Processing**:
   - Navigate to Lab Orders
   - View pending order
   - Select tests (CBC, LFT)
   - Verify total amount calculation

5. **Revenue Check**:
   - Login as admin
   - Go to Revenue Integrity dashboard
   - Verify completed appointment shows as unbilled
   - Check leakage percentage

6. **Notifications**:
   - Click notification bell in header
   - See unbilled service alert
   - Click to navigate to revenue page

---

## 📞 **SUPPORT**

For questions or issues, please contact the development team or open an issue in the repository.

---

## 📄 **LICENSE**

This project is developed for Quasar 4.0 Hackathon by Team MedSync.

---

**Built with ❤️ using Next.js 15, React 19, and Firebase**
