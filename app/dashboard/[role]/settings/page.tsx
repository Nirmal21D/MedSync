"use client"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Hospital, Shield, Bell, Database, Download, Upload, Save } from "lucide-react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { SystemSettings } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import * as React from "react"

export default function SettingsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = React.use(params)
  const { toast } = useToast()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user && role === "admin") {
      getDoc(doc(db, "system", "settings")).then(snapshot => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as SystemSettings)
        }
      })
    }
  }, [user, loading, router, role])

  // Only admin can access settings
  useEffect(() => {
    if (!loading && user && role !== "admin") {
      router.push(`/dashboard/${user.role}`)
    }
  }, [user, loading, role, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || role !== "admin" || !settings) return null

  const handleSave = async () => {
    if (!db || !settings) return
    setIsSaving(true)
    await setDoc(doc(db, "system", "settings"), settings)
    setIsSaving(false)
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully.",
    })
  }

  const handleExportData = () => {
    // Simulate data export
    const data = {
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `medsync-export-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Data exported",
      description: "Hospital data has been exported successfully.",
    })
  }

  const handleBackup = () => {
    toast({
      title: "Backup initiated",
      description: "System backup has been started and will complete in the background.",
    })
  }

  return (
    <DashboardLayout role={role}>
      <div className="relative space-y-6 theme-bg min-h-screen p-4 overflow-hidden">
        {/* Animated color blobs */}
        <div className="absolute -z-10 left-1/2 top-1/4 w-[32vw] h-[32vw] bg-emerald-200 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(-60%,-40%)'}} />
        <div className="absolute -z-10 right-1/4 bottom-0 w-[28vw] h-[28vw] bg-violet-200 opacity-40 rounded-full blur-3xl animate-bgMove" style={{transform:'translate(40%,40%)'}} />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600">Configure hospital system preferences and security</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <Tabs defaultValue="hospital" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="hospital">Hospital Info</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="backup">Backup</TabsTrigger>
              <TabsTrigger value="data">Data Management</TabsTrigger>
            </TabsList>

            <TabsContent value="hospital">
              <Card className="shadow-sm hover:shadow-lg hover:border-primary/30 transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Hospital className="mr-2 h-5 w-5" />
                    Hospital Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hospitalName">Hospital Name</Label>
                      <Input
                        id="hospitalName"
                        value={settings.hospital.name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            hospital: { ...settings.hospital, name: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hospitalPhone">Phone Number</Label>
                      <Input
                        id="hospitalPhone"
                        value={settings.hospital.phone}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            hospital: { ...settings.hospital, phone: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitalEmail">Email Address</Label>
                    <Input
                      id="hospitalEmail"
                      type="email"
                      value={settings.hospital.email}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          hospital: { ...settings.hospital, email: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitalAddress">Address</Label>
                    <Textarea
                      id="hospitalAddress"
                      value={settings.hospital.address}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          hospital: { ...settings.hospital, address: e.target.value },
                        })
                      }
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card className="shadow-sm hover:shadow-lg hover:border-primary/30 transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, emailEnabled: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-gray-600">Receive critical alerts via SMS</p>
                    </div>
                    <Switch
                      checked={settings.notifications.smsEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, smsEnabled: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-gray-600">Receive browser push notifications</p>
                    </div>
                    <Switch
                      checked={settings.notifications.pushEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, pushEnabled: checked },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="shadow-sm hover:shadow-lg hover:border-primary/30 transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            security: { ...settings.security, sessionTimeout: Number.parseInt(e.target.value) || 30 },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minPasswordLength">Minimum Password Length</Label>
                      <Input
                        id="minPasswordLength"
                        type="number"
                        value={settings.security.passwordPolicy.minLength}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            security: {
                              ...settings.security,
                              passwordPolicy: {
                                ...settings.security.passwordPolicy,
                                minLength: Number.parseInt(e.target.value) || 8,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Special Characters</Label>
                      <p className="text-sm text-gray-600">Passwords must contain special characters</p>
                    </div>
                    <Switch
                      checked={settings.security.passwordPolicy.requireSpecialChars}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            passwordPolicy: {
                              ...settings.security.passwordPolicy,
                              requireSpecialChars: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Numbers</Label>
                      <p className="text-sm text-gray-600">Passwords must contain numbers</p>
                    </div>
                    <Switch
                      checked={settings.security.passwordPolicy.requireNumbers}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            passwordPolicy: {
                              ...settings.security.passwordPolicy,
                              requireNumbers: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-600">Enable 2FA for all users</p>
                    </div>
                    <Switch
                      checked={settings.security.twoFactorEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: { ...settings.security, twoFactorEnabled: checked },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backup">
              <Card className="shadow-sm hover:shadow-lg hover:border-primary/30 transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5" />
                    Backup Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automatic Backup</Label>
                      <p className="text-sm text-gray-600">Enable automatic system backups</p>
                    </div>
                    <Switch
                      checked={settings.backup.autoBackup}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          backup: { ...settings.backup, autoBackup: checked },
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency">Backup Frequency</Label>
                      <Select
                        value={settings.backup.backupFrequency}
                        onValueChange={(value: "daily" | "weekly" | "monthly") =>
                          setSettings({
                            ...settings,
                            backup: { ...settings.backup, backupFrequency: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retentionDays">Retention Period (days)</Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        value={settings.backup.retentionDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            backup: { ...settings.backup, retentionDays: Number.parseInt(e.target.value) || 30 },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={handleBackup} variant="outline">
                      <Database className="mr-2 h-4 w-4" />
                      Create Backup Now
                    </Button>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download Latest Backup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data">
              <Card className="shadow-sm hover:shadow-lg hover:border-primary/30 transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5" />
                    Data Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Export Data</h3>
                      <p className="text-sm text-gray-600">Export hospital data for backup or migration purposes</p>
                      <Button onClick={handleExportData} variant="outline" className="w-full bg-transparent">
                        <Download className="mr-2 h-4 w-4" />
                        Export All Data
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Import Data</h3>
                      <p className="text-sm text-gray-600">Import data from previous system or backup files</p>
                      <Button variant="outline" className="w-full bg-transparent">
                        <Upload className="mr-2 h-4 w-4" />
                        Import Data
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">Data Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">1,247</p>
                        <p className="text-sm text-gray-600">Total Records</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">98.5%</p>
                        <p className="text-sm text-gray-600">Data Integrity</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">2.3 GB</p>
                        <p className="text-sm text-gray-600">Storage Used</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">24h</p>
                        <p className="text-sm text-gray-600">Last Backup</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}
