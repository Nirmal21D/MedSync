export interface Patient {
  id: string
  uhid: string // Unique Hospital ID with barcode
  name: string
  age: number
  gender: "male" | "female" | "other"
  phone: string
  email?: string
  address: string
  diagnosis?: string
  assignedDoctor?: string
  assignedBed?: string
  vitals?: {
    bloodPressure: string
    heartRate: number
    temperature: number
    oxygenSaturation: number
  }
  history?: string[]
  admissionDate?: Date
  status: "admitted" | "discharged" | "critical" | "stable"
  nursingNotes?: NursingNote[]
  documents?: PatientDocument[]
  bills?: Array<{
    id: string;
    date: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    status: "paid" | "unpaid";
  }>;
  appointments?: string[] // Array of appointment IDs
  labOrders?: string[] // Array of lab order IDs
  medicalHistory?: any[]
}

export interface NursingNote {
  id: string
  patientId: string
  patientName: string
  nurseId: string
  nurseName: string
  shift: "morning" | "afternoon" | "night"
  type: "general" | "medication" | "vitals" | "observation" | "handover"
  content: string
  timestamp: Date
  priority: "low" | "medium" | "high"
  tags?: string[]
}

export interface Bed {
  id: string
  number: string
  ward: string
  floor: number
  type: "general" | "icu" | "private" | "emergency"
  status: "available" | "occupied" | "maintenance" | "reserved"
  patientId?: string
  patientName?: string
  assignedNurse?: string
  lastCleaned?: Date
  features: string[]
}

export interface PatientDocument {
  id: string
  patientId: string
  name: string
  type: "lab-report" | "xray" | "prescription" | "discharge-summary" | "other"
  uploadDate: Date
  uploadedBy: string
  fileSize: string
  url: string
}

export interface SystemSettings {
  hospital: {
    name: string
    address: string
    phone: string
    email: string
    logo?: string
  }
  notifications: {
    emailEnabled: boolean
    smsEnabled: boolean
    pushEnabled: boolean
  }
  security: {
    sessionTimeout: number
    passwordPolicy: {
      minLength: number
      requireSpecialChars: boolean
      requireNumbers: boolean
    }
    twoFactorEnabled: boolean
  }
  backup: {
    autoBackup: boolean
    backupFrequency: "daily" | "weekly" | "monthly"
    retentionDays: number
  }
  billing?: {
    bedCharge: number;
    consultationCharge: number;
    serviceTypes: Array<{ name: string; defaultPrice: number }>;
  };
}

export interface AnalyticsData {
  patientFlow: {
    admissions: number
    discharges: number
    transfers: number
    date: Date
  }[]
  departmentStats: {
    department: string
    patients: number
    staff: number
    utilization: number
  }[]
  financialMetrics: {
    revenue: number
    expenses: number
    profit: number
    month: string
  }[]
  inventoryTrends: {
    category: string
    usage: number
    cost: number
    month: string
  }[]
}

export interface Prescription {
  id: string
  patientId: string
  patientName: string
  patientUhid: string
  doctorId: string
  doctorName: string
  appointmentId?: string // Link to appointment
  medicines: {
    name: string
    dosage: string
    frequency: string
    duration: string
  }[]
  labTests?: string[] // Recommended lab tests
  status: "pending" | "approved" | "rejected" | "dispensed"
  notes?: string
  createdAt: Date
  processedAt?: Date
  processedBy?: string
  dispensedFromHospital?: boolean // Track if patient bought from hospital pharmacy
}


export interface InventoryItem {
  id: string
  name: string
  category: "equipment" | "supplies" | "medicine"
  quantity: number
  unit: string
  location: string
  lastUpdated: Date
  minThreshold: number
  status: "available" | "low-stock" | "out-of-stock"
  cost?: number
}

export interface Staff {
  id: string
  name: string
  email: string
  role: "admin" | "doctor" | "nurse" | "pharmacist" | "receptionist"
  specialization?: string
  department: string
  phone: string
  status: "active" | "inactive"
  joinDate: Date
  salary?: number
  // OPD Management
  opdAvailable?: boolean // Can this doctor see OPD patients?
  opdTimings?: {
    days: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[]
    startTime: string // e.g., "09:00"
    endTime: string   // e.g., "17:00"
    slotDuration: number // minutes per consultation
    maxPatientsPerDay?: number
  }
}

export interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "error" | "success"
  userId?: string
  role?: string
  read: boolean
  createdAt: Date
  actionUrl?: string
}

export interface MedicineReminder {
  id: string
  patientId: string
  patientName: string
  medicineName: string
  dosage: string
  frequency: string
  startDate: Date
  endDate?: Date
  timeOfDay: string[] // e.g., ["morning", "evening"]
  status: 'active' | 'completed' | 'paused'
  prescriptionId?: string
}

export interface Appointment {
  id: string
  uhid: string
  patientId: string
  patientName: string
  patientPhone: string
  doctorId: string
  doctorName: string
  department: string
  appointmentDate: Date
  timeSlot: string // e.g., "09:00-09:30"
  type: "consultation" | "follow-up" | "emergency" | "procedure"
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "no-show"
  reason?: string
  notes?: string
  createdAt: Date
  createdBy: string // userId of who created (receptionist/patient)
  queueNumber?: number
  checkInTime?: Date
  consultationStartTime?: Date
  consultationEndTime?: Date
  voiceBooked?: boolean // Indicates if booked via voice
  prescriptionId?: string // Link to prescription
  billId?: string // Link to generated bill
  consultationNotes?: string // Doctor's notes after consultation
}

export interface LabTest {
  id: string
  testCode: string
  testName: string
  category: "blood" | "urine" | "imaging" | "pathology" | "other"
  price: number
  turnaroundTime: string // e.g., "2 hours", "1 day"
  description?: string
  requirements?: string // e.g., "Fasting required"
}

export interface LabOrder {
  id: string
  orderId: string // Unique order number
  patientId: string
  patientUhid: string
  patientName: string
  doctorId: string
  doctorName: string
  tests: {
    testId: string
    testName: string
    price: number
  }[]
  totalAmount: number
  status: "pending" | "sample-collected" | "in-progress" | "completed" | "cancelled"
  priority: "routine" | "urgent" | "stat"
  orderedAt: Date
  sampleCollectedAt?: Date
  completedAt?: Date
  results?: {
    testId: string
    testName: string
    result: string
    normalRange?: string
    unit?: string
    remarks?: string
  }[]
  technicianId?: string
  technicianName?: string
  notes?: string
  billGenerated: boolean
}

export interface ServiceCatalog {
  id: string
  serviceCode: string
  serviceName: string
  category: "consultation" | "procedure" | "investigation" | "accommodation" | "pharmacy" | "other"
  department: string
  price: number
  description?: string
  duration?: number // in minutes
  requiresDoctor?: boolean
  active: boolean
}

export interface BillingItem {
  id: string
  serviceId?: string
  serviceName: string
  category: string
  quantity: number
  unitPrice: number
  totalPrice: number
  discount?: number
  taxAmount?: number
  linkedTo?: {
    type: "appointment" | "labOrder" | "prescription" | "bed" | "inventory"
    id: string
  }
  timestamp: Date
  billedBy: string
}

export interface UnbilledService {
  id: string
  patientId: string
  patientName: string
  uhid: string
  serviceType: "appointment" | "labOrder" | "prescription" | "procedure"
  serviceName: string
  expectedAmount: number
  performedAt: Date
  performedBy: string
  reason: string
  alertedAt: Date
  status: "pending" | "billed" | "waived"
}
