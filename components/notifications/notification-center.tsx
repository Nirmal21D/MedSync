"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Bell, BellRing, Check, X, AlertCircle, TrendingUp, Package, FileText, Calendar, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "critical" | "warning" | "info" | "success"
  category: "patient" | "inventory" | "billing" | "appointment" | "lab" | "prescription"
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  metadata?: Record<string, any>
}

const categoryIcons = {
  patient: AlertCircle,
  inventory: Package,
  billing: DollarSign,
  appointment: Calendar,
  lab: FileText,
  prescription: FileText
}

const typeColors = {
  critical: "text-red-600 dark:text-red-400",
  warning: "text-orange-600 dark:text-orange-400",
  info: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400"
}

export function NotificationCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!db || !user?.email) return

    // Real-time listener for notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientEmail", "==", user.email),
      orderBy("timestamp", "desc"),
      limit(20)
    )

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as Notification))

      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    })

    return () => unsubscribe()
  }, [user?.email])

  // Simulate notifications for demo (remove in production)
  useEffect(() => {
    if (!user) return

    const demoNotifications: Notification[] = [
      {
        id: "demo-1",
        type: "critical",
        category: "patient",
        title: "Critical Patient Alert",
        message: "Patient John Doe (UHID-202501-00001) has high blood pressure: 180/120",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false,
        actionUrl: "/dashboard/doctor/patients/john-doe"
      },
      {
        id: "demo-2",
        type: "warning",
        category: "inventory",
        title: "Low Stock Alert",
        message: "Paracetamol stock below reorder level (15 units remaining)",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
        actionUrl: "/dashboard/pharmacist/inventory"
      },
      {
        id: "demo-3",
        type: "info",
        category: "appointment",
        title: "New Appointment",
        message: "New appointment booked by Sarah Wilson for tomorrow 10:00 AM",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: true,
        actionUrl: "/dashboard/doctor/appointments"
      },
      {
        id: "demo-4",
        type: "warning",
        category: "billing",
        title: "Unbilled Service",
        message: "Consultation completed for Patient ABC123 but bill not generated",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        read: false,
        actionUrl: "/dashboard/admin/revenue-integrity"
      },
      {
        id: "demo-5",
        type: "info",
        category: "lab",
        title: "Lab Results Ready",
        message: "CBC test results available for Patient XYZ789",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        read: true,
        actionUrl: "/dashboard/doctor/lab-orders"
      }
    ]

    // Only use demo data if no real notifications
    if (notifications.length === 0) {
      setNotifications(demoNotifications)
      setUnreadCount(demoNotifications.filter(n => !n.read).length)
    }
  }, [user, notifications.length])

  const markAsRead = async (notificationId: string) => {
    if (!db) return

    try {
      const notifRef = doc(db, "notifications", notificationId)
      await updateDoc(notifRef, {
        read: true
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!db) return

    try {
      const unreadNotifs = notifications.filter(n => !n.read)
      await Promise.all(
        unreadNotifs.map(n => {
          if (!db) return Promise.resolve()
          const notifRef = doc(db, "notifications", n.id)
          return updateDoc(notifRef, { read: true })
        })
      )
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <BellRing className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = categoryIcons[notification.category]
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                      !notification.read && "bg-blue-50/50 dark:bg-blue-900/10"
                    )}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id)
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl
                        setOpen(false)
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={cn("mt-1", typeColors[notification.type])}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm leading-tight">
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground leading-snug">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getRelativeTime(notification.timestamp)}
                          </span>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-blue-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full text-sm" size="sm">
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
