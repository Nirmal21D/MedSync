/**
 * Billing and Revenue Utilities
 * Auto-billing and revenue integrity functions
 */

import type { BillingItem, ServiceCatalog, UnbilledService } from './types'

/**
 * Service catalog with standard pricing
 */
export const standardServices: Omit<ServiceCatalog, 'id'>[] = [
  // Consultations
  {
    serviceCode: 'CONS-GEN',
    serviceName: 'General Consultation',
    category: 'consultation',
    department: 'General Medicine',
    price: 500,
    duration: 15,
    requiresDoctor: true,
    active: true
  },
  {
    serviceCode: 'CONS-SPEC',
    serviceName: 'Specialist Consultation',
    category: 'consultation',
    department: 'Various',
    price: 800,
    duration: 20,
    requiresDoctor: true,
    active: true
  },
  {
    serviceCode: 'CONS-EMER',
    serviceName: 'Emergency Consultation',
    category: 'consultation',
    department: 'Emergency',
    price: 1200,
    duration: 30,
    requiresDoctor: true,
    active: true
  },
  
  // Accommodations
  {
    serviceCode: 'BED-GEN',
    serviceName: 'General Ward Bed (per day)',
    category: 'accommodation',
    department: 'Administration',
    price: 1000,
    active: true
  },
  {
    serviceCode: 'BED-PVT',
    serviceName: 'Private Room (per day)',
    category: 'accommodation',
    department: 'Administration',
    price: 2500,
    active: true
  },
  {
    serviceCode: 'BED-ICU',
    serviceName: 'ICU Bed (per day)',
    category: 'accommodation',
    department: 'Critical Care',
    price: 5000,
    active: true
  },
  
  // Common Procedures
  {
    serviceCode: 'PROC-ECG',
    serviceName: 'ECG',
    category: 'procedure',
    department: 'Cardiology',
    price: 300,
    duration: 10,
    active: true
  },
  {
    serviceCode: 'PROC-XRAY',
    serviceName: 'X-Ray',
    category: 'procedure',
    department: 'Radiology',
    price: 600,
    duration: 15,
    active: true
  },
  {
    serviceCode: 'PROC-DRESS',
    serviceName: 'Wound Dressing',
    category: 'procedure',
    department: 'General',
    price: 200,
    duration: 20,
    active: true
  },
  
  // Investigations
  {
    serviceCode: 'LAB-CBC',
    serviceName: 'Complete Blood Count',
    category: 'investigation',
    department: 'Laboratory',
    price: 400,
    active: true
  },
  {
    serviceCode: 'LAB-LFT',
    serviceName: 'Liver Function Test',
    category: 'investigation',
    department: 'Laboratory',
    price: 800,
    active: true
  },
  {
    serviceCode: 'LAB-KFT',
    serviceName: 'Kidney Function Test',
    category: 'investigation',
    department: 'Laboratory',
    price: 700,
    active: true
  }
]

/**
 * Create a billing item for a service
 */
export function createBillingItem(
  service: ServiceCatalog,
  quantity: number = 1,
  linkedTo?: BillingItem['linkedTo'],
  billedBy: string = 'system'
): BillingItem {
  const totalPrice = service.price * quantity
  
  return {
    id: `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    serviceId: service.id,
    serviceName: service.serviceName,
    category: service.category,
    quantity,
    unitPrice: service.price,
    totalPrice,
    linkedTo,
    timestamp: new Date(),
    billedBy
  }
}

/**
 * Detect unbilled services
 */
export function detectUnbilledServices(
  patientId: string,
  patientName: string,
  uhid: string,
  appointments: any[],
  labOrders: any[],
  prescriptions: any[],
  existingBills: BillingItem[]
): UnbilledService[] {
  const unbilled: UnbilledService[] = []
  
  // Check appointments without bills
  appointments.forEach(apt => {
    if (apt.patientId === patientId && apt.status === 'completed') {
      const billed = existingBills.some(
        bill => bill.linkedTo?.type === 'appointment' && bill.linkedTo.id === apt.id
      )
      
      if (!billed) {
        unbilled.push({
          id: `UB-APT-${apt.id}`,
          patientId,
          patientName,
          uhid,
          serviceType: 'appointment',
          serviceName: `Consultation with ${apt.doctorName}`,
          expectedAmount: apt.type === 'emergency' ? 1200 : 500,
          performedAt: new Date(apt.consultationEndTime || apt.appointmentDate),
          performedBy: apt.doctorName,
          reason: 'Completed appointment not billed',
          alertedAt: new Date(),
          status: 'pending'
        })
      }
    }
  })
  
  // Check lab orders without bills
  labOrders.forEach(order => {
    if (order.patientId === patientId && order.status === 'completed') {
      const billed = existingBills.some(
        bill => bill.linkedTo?.type === 'labOrder' && bill.linkedTo.id === order.id
      )
      
      if (!billed) {
        unbilled.push({
          id: `UB-LAB-${order.id}`,
          patientId,
          patientName,
          uhid,
          serviceType: 'labOrder',
          serviceName: `Lab Tests: ${order.tests.map((t: any) => t.testName).join(', ')}`,
          expectedAmount: order.totalAmount,
          performedAt: new Date(order.completedAt || order.orderedAt),
          performedBy: order.technicianName || 'Lab',
          reason: 'Completed lab order not billed',
          alertedAt: new Date(),
          status: 'pending'
        })
      }
    }
  })
  
  // Check dispensed prescriptions without bills
  prescriptions.forEach(rx => {
    if (rx.patientId === patientId && rx.status === 'approved') {
      const billed = existingBills.some(
        bill => bill.linkedTo?.type === 'prescription' && bill.linkedTo.id === rx.id
      )
      
      if (!billed && rx.dispensed) {
        const totalAmount = rx.medicines.reduce((sum: number, med: any) => sum + (med.price || 0), 0)
        
        unbilled.push({
          id: `UB-RX-${rx.id}`,
          patientId,
          patientName,
          uhid,
          serviceType: 'prescription',
          serviceName: `Medicines: ${rx.medicines.length} items`,
          expectedAmount: totalAmount,
          performedAt: new Date(rx.processedAt || rx.createdAt),
          performedBy: rx.processedBy || 'Pharmacist',
          reason: 'Dispensed prescription not billed',
          alertedAt: new Date(),
          status: 'pending'
        })
      }
    }
  })
  
  return unbilled
}

/**
 * Calculate total unbilled amount
 */
export function calculateUnbilledAmount(unbilledServices: UnbilledService[]): number {
  return unbilledServices
    .filter(s => s.status === 'pending')
    .reduce((sum, service) => sum + service.expectedAmount, 0)
}

/**
 * Get service by code
 */
export function getServiceByCode(serviceCode: string): Omit<ServiceCatalog, 'id'> | undefined {
  return standardServices.find(s => s.serviceCode === serviceCode)
}

/**
 * Format currency for India
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount)
}
