export interface Patient {
  id: string
  name: string
  age: number
  gender: "male" | "female" | "other"
  phone: string
  email?: string
  address: string
  diagnosis: string
  assignedDoctor: string
  assignedBed?: string
  vitals: {
    bloodPressure: string
    heartRate: number
    temperature: number
    oxygenSaturation: number
  }
  history: string[]
  admissionDate: Date
  status: "admitted" | "discharged" | "critical"
  nursingNotes?: NursingNote[]
  documents?: PatientDocument[]
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
  doctorId: string
  doctorName: string
  medicines: {
    name: string
    dosage: string
    frequency: string
    duration: string
  }[]
  status: "pending" | "approved" | "rejected"
  notes?: string
  createdAt: Date
  processedAt?: Date
  processedBy?: string
}

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  date: Date
  time: string
  type: "consultation" | "follow-up" | "emergency"
  status: "scheduled" | "completed" | "cancelled"
  notes?: string
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
