/**
 * Appointment Utilities
 * Time slot management and appointment helpers
 */

import type { Appointment } from './types'

/**
 * Generate time slots for a day
 * @param startHour Starting hour (24-hour format)
 * @param endHour Ending hour (24-hour format)
 * @param slotDuration Duration in minutes
 */
export function generateTimeSlots(
  startHour: number = 9,
  endHour: number = 17,
  slotDuration: number = 30
): string[] {
  const slots: string[] = []
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const endMinute = minute + slotDuration
      const endHourAdjusted = endMinute >= 60 ? hour + 1 : hour
      const endMinuteAdjusted = endMinute >= 60 ? endMinute - 60 : endMinute
      
      if (endHourAdjusted > endHour) break
      
      const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const endTime = `${String(endHourAdjusted).padStart(2, '0')}:${String(endMinuteAdjusted).padStart(2, '0')}`
      
      slots.push(`${startTime}-${endTime}`)
    }
  }
  
  return slots
}

/**
 * Check if a time slot is available
 */
export function isSlotAvailable(
  appointments: Appointment[],
  date: Date,
  timeSlot: string,
  doctorId: string
): boolean {
  const dateStr = date.toISOString().split('T')[0]
  
  return !appointments.some(apt => {
    // Handle Firestore timestamp format
    const aptDate = apt.appointmentDate instanceof Date 
      ? apt.appointmentDate 
      : new Date((apt.appointmentDate as any)?.seconds ? (apt.appointmentDate as any).seconds * 1000 : apt.appointmentDate)
    const aptDateStr = aptDate.toISOString().split('T')[0]
    return (
      aptDateStr === dateStr &&
      apt.timeSlot === timeSlot &&
      apt.doctorId === doctorId &&
      apt.status !== 'cancelled' &&
      apt.status !== 'no-show'
    )
  })
}

/**
 * Get next available queue number for a date
 */
export function getNextQueueNumber(appointments: Appointment[], date: Date): number {
  const dateStr = date.toISOString().split('T')[0]
  
  const todayAppointments = appointments.filter(apt => {
    // Handle Firestore timestamp format
    const aptDate = apt.appointmentDate instanceof Date 
      ? apt.appointmentDate 
      : new Date((apt.appointmentDate as any)?.seconds ? (apt.appointmentDate as any).seconds * 1000 : apt.appointmentDate)
    const aptDateStr = aptDate.toISOString().split('T')[0]
    return aptDateStr === dateStr
  })
  
  const queueNumbers = todayAppointments
    .map(apt => apt.queueNumber || 0)
    .filter(num => num > 0)
  
  return queueNumbers.length > 0 ? Math.max(...queueNumbers) + 1 : 1
}

/**
 * Format time slot for display
 */
export function formatTimeSlot(timeSlot: string): string {
  const [start, end] = timeSlot.split('-')
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':')
    const hourNum = parseInt(hour)
    const period = hourNum >= 12 ? 'PM' : 'AM'
    const hour12 = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum
    return `${hour12}:${minute} ${period}`
  }
  
  return `${formatTime(start)} - ${formatTime(end)}`
}

/**
 * Get appointment status color
 */
export function getAppointmentStatusColor(status: Appointment['status']): string {
  const colors = {
    scheduled: 'blue',
    confirmed: 'green',
    'in-progress': 'purple',
    completed: 'gray',
    cancelled: 'red',
    'no-show': 'orange'
  }
  return colors[status] || 'gray'
}

/**
 * Calculate estimated wait time
 */
export function estimateWaitTime(
  currentQueueNumber: number,
  appointments: Appointment[],
  averageConsultationTime: number = 15
): number {
  const activeAppointments = appointments.filter(
    apt => apt.status === 'in-progress' || apt.status === 'scheduled'
  )
  
  const ahead = activeAppointments.filter(
    apt => (apt.queueNumber || 0) < currentQueueNumber
  )
  
  return ahead.length * averageConsultationTime
}

/**
 * Check if appointment is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Get department list
 */
export function getDepartments(): string[] {
  return [
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Gynecology',
    'ENT',
    'Dermatology',
    'Neurology',
    'Psychiatry',
    'Emergency'
  ]
}
