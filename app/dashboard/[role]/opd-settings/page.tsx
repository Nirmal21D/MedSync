"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, Calendar, Save, AlertCircle } from "lucide-react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Staff } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DoctorOPDSettingsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const { toast } = useToast()
  const [doctorData, setDoctorData] = useState<Staff | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [opdSettings, setOpdSettings] = useState({
    opdAvailable: false,
    opdStartTime: "09:00",
    opdEndTime: "17:00",
    opdSlotDuration: 30,
    opdMaxPatients: 20,
    opdDays: [] as string[],
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    
    if (user && db) {
      fetchDoctorData()
    }
  }, [user, loading, router])

  const fetchDoctorData = async () => {
    if (!user || !db) return

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid || "demo"))
      if (userDoc.exists()) {
        const data = { id: userDoc.id, ...userDoc.data() } as Staff
        setDoctorData(data)
        
        // Load existing OPD settings
        if (data.opdTimings) {
          setOpdSettings({
            opdAvailable: data.opdAvailable || false,
            opdStartTime: data.opdTimings.startTime || "09:00",
            opdEndTime: data.opdTimings.endTime || "17:00",
            opdSlotDuration: data.opdTimings.slotDuration || 30,
            opdMaxPatients: data.opdTimings.maxPatientsPerDay || 20,
            opdDays: data.opdTimings.days || [],
          })
        } else {
          setOpdSettings({
            ...opdSettings,
            opdAvailable: data.opdAvailable || false,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching doctor data:", error)
    }
  }

  const handleSave = async () => {
    if (!user || !db || !doctorData) return

    setSaving(true)

    try {
      const updatedData: Partial<Staff> = {
        ...doctorData,
        opdTimings: {
          days: opdSettings.opdDays as any,
          startTime: opdSettings.opdStartTime,
          endTime: opdSettings.opdEndTime,
          slotDuration: opdSettings.opdSlotDuration,
          maxPatientsPerDay: opdSettings.opdMaxPatients,
        }
      }

      await setDoc(doc(db, "users", user.uid || "demo"), updatedData)

      toast({
        title: "OPD Settings Saved",
        description: "Your OPD schedule has been updated successfully.",
      })

      fetchDoctorData()
    } catch (error) {
      console.error("Error saving OPD settings:", error)
      toast({
        title: "Error",
        description: "Failed to save OPD settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: string) => {
    if (opdSettings.opdDays.includes(day)) {
      setOpdSettings({
        ...opdSettings,
        opdDays: opdSettings.opdDays.filter(d => d !== day)
      })
    } else {
      setOpdSettings({
        ...opdSettings,
        opdDays: [...opdSettings.opdDays, day]
      })
    }
  }

  if (loading) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!doctorData?.opdAvailable) {
    return (
      <DashboardLayout role={role}>
        <div className="container mx-auto p-6 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              OPD access is not enabled for your account. Please contact the administrator to enable OPD availability.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={role}>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">OPD Settings</h1>
          <p className="text-muted-foreground">Manage your Out-Patient Department schedule and availability</p>
        </div>

        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Configure Your OPD Schedule
            </CardTitle>
            <CardDescription>Set your consultation timings, slot duration, and working days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Time Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  OPD Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={opdSettings.opdStartTime}
                  onChange={(e) => setOpdSettings({ ...opdSettings, opdStartTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  OPD End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={opdSettings.opdEndTime}
                  onChange={(e) => setOpdSettings({ ...opdSettings, opdEndTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
                <Input
                  id="slotDuration"
                  type="number"
                  value={opdSettings.opdSlotDuration}
                  onChange={(e) => setOpdSettings({ ...opdSettings, opdSlotDuration: Number(e.target.value) })}
                  min={15}
                  step={15}
                />
                <p className="text-xs text-muted-foreground">Time allocated per patient consultation</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPatients">Max Patients per Day</Label>
                <Input
                  id="maxPatients"
                  type="number"
                  value={opdSettings.opdMaxPatients}
                  onChange={(e) => setOpdSettings({ ...opdSettings, opdMaxPatients: Number(e.target.value) })}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">Maximum appointments per day</p>
              </div>
            </div>

            {/* Working Days */}
            <div className="space-y-3">
              <Label className="text-base">Working Days</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                  <div
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`cursor-pointer p-4 rounded-lg border-2 transition-all text-center ${
                      opdSettings.opdDays.includes(day)
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <p className="font-medium capitalize">{day.substring(0, 3)}</p>
                    <p className="text-xs text-muted-foreground">{day}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-2">Schedule Summary</h3>
                <div className="space-y-1 text-sm">
                  <p>⏰ Timings: {opdSettings.opdStartTime} - {opdSettings.opdEndTime}</p>
                  <p>📅 Working Days: {opdSettings.opdDays.length > 0 ? opdSettings.opdDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") : "None selected"}</p>
                  <p>👥 Slot Duration: {opdSettings.opdSlotDuration} minutes</p>
                  <p>📊 Max Patients: {opdSettings.opdMaxPatients} per day</p>
                  <p className="pt-2 text-muted-foreground">
                    Estimated slots per day: {Math.floor((parseInt(opdSettings.opdEndTime.split(':')[0]) - parseInt(opdSettings.opdStartTime.split(':')[0])) * 60 / opdSettings.opdSlotDuration)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving || opdSettings.opdDays.length === 0}
              className="w-full"
              size="lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save OPD Settings"}
            </Button>

            {opdSettings.opdDays.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select at least one working day to save your OPD schedule.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
