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
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"

export default function SettingsPage({ params }: { params: { role: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { role } = params
  const { toast } = useToast()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [totalPatients, setTotalPatients] = useState(0)
  const [totalStaff, setTotalStaff] = useState(0)
  const [totalBeds, setTotalBeds] = useState(0)
  const [editHospital, setEditHospital] = useState(false)
  const [hospitalDraft, setHospitalDraft] = useState(settings?.hospital)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    if (db && user && role === "admin") {
      getDoc(doc(db, "system", "settings")).then(async snapshot => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as SystemSettings)
        } else {
          // Create default settings
          const defaultSettings: SystemSettings = {
            hospital: { name: "", address: "", phone: "", email: "" },
            notifications: { emailEnabled: true, smsEnabled: false, pushEnabled: false },
            security: {
              sessionTimeout: 30,
              passwordPolicy: { minLength: 8, requireSpecialChars: false, requireNumbers: false },
              twoFactorEnabled: false,
            },
            backup: { autoBackup: false, backupFrequency: "weekly", retentionDays: 30 },
          }
          if (db) {
            await setDoc(doc(db, "system", "settings"), defaultSettings)
            setSettings(defaultSettings)
          }
        }
      })
    }
  }, [user, loading, router, role])

  useEffect(() => {
    if (db && user && role === "admin") {
      getDocs(collection(db, "patients")).then(snapshot => setTotalPatients(snapshot.size))
      getDocs(collection(db, "users")).then(snapshot => setTotalStaff(snapshot.size))
      getDocs(collection(db, "beds")).then(snapshot => setTotalBeds(snapshot.size))
    }
  }, [user, role])

  useEffect(() => {
    setHospitalDraft(settings?.hospital)
  }, [settings?.hospital])

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

  if (!user || role !== "admin") return null
  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Settings not found. Please contact admin.</div>
      </div>
    )
  }

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

  // Download Excel template for staff import
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        name: "",
        email: "",
        role: "",
        specialization: "",
        department: "",
        phone: "",
        password: "",
      },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "StaffTemplate")
    XLSX.writeFile(wb, "staff-import-template.xlsx")
  }

  // Import staff from Excel
  const handleImportStaff = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    for (const row of rows) {
      // Validate required fields
      if (!row.email || !row.password || !row.name || !row.role || !row.department || !row.phone) continue
      try {
        if (!auth || !db) return
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          row.email,
          row.password
        )
        const uid = userCredential.user.uid
        await setDoc(doc(db, "users", uid), {
          id: uid,
          name: row.name,
          email: row.email,
          role: row.role,
          specialization: row.specialization || "",
          department: row.department,
          phone: row.phone,
          status: "active",
          joinDate: new Date().toISOString(),
        })
      } catch (err) {
        // Optionally handle errors (e.g., duplicate email)
        console.error("Import error:", err)
      }
    }
    toast({
      title: "Import complete",
      description: "Staff data imported from Excel.",
    })
  }

  // Export hospital overview/analytics as PDF
  const handleExportPDF = async () => {
    const doc = new jsPDF();
    let y = 20;

    // Title
    doc.setFontSize(22);
    doc.text("MedSync Hospital Analytics Report", 14, y);
    y += 10;

    // Hospital Info
    doc.setFontSize(14);
    doc.text("Hospital Information", 14, y);
    doc.setFontSize(11);
    y += 7;
    doc.text(`Name: ${settings?.hospital.name || "-"}`, 14, y);
    y += 6;
    doc.text(`Address: ${settings?.hospital.address || "-"}`, 14, y);
    y += 6;
    doc.text(`Phone: ${settings?.hospital.phone || "-"}`, 14, y);
    y += 6;
    doc.text(`Email: ${settings?.hospital.email || "-"}`, 14, y);
    y += 10;

    // Key Stats
    doc.setFontSize(14);
    doc.text("Key Statistics", 14, y);
    doc.setFontSize(11);
    y += 7;
    doc.text(`Total Patients: ${totalPatients}`, 14, y);
    y += 6;
    doc.text(`Total Staff: ${totalStaff}`, 14, y);
    y += 6;
    doc.text(`Total Beds: ${totalBeds}`, 14, y);
    y += 10;

    // Department Breakdown
    doc.setFontSize(14);
    doc.text("Department Breakdown", 14, y);
    y += 4;

    // Fetch department stats
    let departmentStats: { department: string, patients: number, staff: number }[] = [];
    if (db) {
      const [patientsSnap, staffSnap] = await Promise.all([
        getDocs(collection(db, "patients")),
        getDocs(collection(db, "users"))
      ]);
      const patients = patientsSnap.docs.map(doc => doc.data());
      const staff = staffSnap.docs.map(doc => doc.data());
      const deptMap: Record<string, { patients: number, staff: number }> = {};
      patients.forEach((p: any) => {
        if (!deptMap[p.department]) deptMap[p.department] = { patients: 0, staff: 0 };
        deptMap[p.department].patients += 1;
      });
      staff.forEach((s: any) => {
        if (!deptMap[s.department]) deptMap[s.department] = { patients: 0, staff: 0 };
        deptMap[s.department].staff += 1;
      });
      departmentStats = Object.entries(deptMap).map(([department, { patients, staff }]) => ({
        department, patients, staff
      }));
    }

    const deptTable = autoTable(doc, {
      startY: y + 2,
      head: [["Department", "Patients", "Staff"]],
      body: departmentStats.map(d => [d.department, d.patients, d.staff]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
    });
    y = (deptTable as any)?.finalY ? (deptTable as any).finalY + 8 : y + 8;

    // Recent Admissions
    doc.setFontSize(14);
    doc.text("Recent Admissions", 14, y);
    y += 4;
    let recentPatients: any[] = [];
    if (db) {
      const patientsSnap = await getDocs(collection(db, "patients"));
      recentPatients = patientsSnap.docs
        .map(doc => doc.data())
        .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())
        .slice(0, 5);
    }
    autoTable(doc, {
      startY: y + 2,
      head: [["Name", "Department", "Admission Date"]],
      body: recentPatients.map(p => [
        p.name || "-",
        p.department || "-",
        p.admissionDate ? new Date(p.admissionDate).toLocaleDateString() : "-"
      ]),
      theme: "grid",
      headStyles: { fillColor: [39, 174, 96] },
      styles: { fontSize: 10 },
    });
    // Fix: doc.lastAutoTable may not exist on jsPDF, use the return value from autoTable
    y = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 8
      : y + 8;

    // Security & Notification Settings
    doc.setFontSize(14);
    doc.text("Security & Notification Settings", 14, y);
    doc.setFontSize(11);
    y += 7;
    doc.text(`Session Timeout: ${settings?.security.sessionTimeout} min`, 14, y);
    y += 6;
    doc.text(`Min Password Length: ${settings?.security.passwordPolicy.minLength}`, 14, y);
    y += 6;
    doc.text(`Special Chars: ${settings?.security.passwordPolicy.requireSpecialChars ? "Yes" : "No"}`, 14, y);
    y += 6;
    doc.text(`Numbers: ${settings?.security.passwordPolicy.requireNumbers ? "Yes" : "No"}`, 14, y);
    y += 6;
    doc.text(`2FA: ${settings?.security.twoFactorEnabled ? "Enabled" : "Disabled"}`, 14, y);
    y += 8;
    doc.text(`Email Notifications: ${settings?.notifications.emailEnabled ? "Enabled" : "Disabled"}`, 14, y);
    y += 6;
    doc.text(`SMS Notifications: ${settings?.notifications.smsEnabled ? "Enabled" : "Disabled"}`, 14, y);
    y += 6;
    doc.text(`Push Notifications: ${settings?.notifications.pushEnabled ? "Enabled" : "Disabled"}`, 14, y);

    // Footer
    doc.setFontSize(10);
    doc.text(`Generated by MedSync on ${new Date().toLocaleString()}`, 14, 285);

    doc.save("hospital-analytics-overview.pdf");
  };

  const handleCreateBackup = async () => {
    if (!db) return
    // Example: export all users, patients, inventory, beds
    const collections = ["users", "patients", "inventory", "beds"]
    const backup: Record<string, any[]> = {}
    for (const col of collections) {
      const snap = await getDocs(collection(db, col))
      backup[col] = snap.docs.map(doc => doc.data())
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `medsync-backup-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Backup created", description: "All data exported as JSON." })
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
              <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
              <p className="text-muted-foreground">Configure hospital system preferences and security</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

        <Tabs defaultValue="hospital" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hospital">Hospital Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>

          <TabsContent value="hospital">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Hospital className="mr-2 h-5 w-5" />
                  Hospital Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editHospital ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hospitalName">Hospital Name</Label>
                        <Input
                          id="hospitalName"
                          value={hospitalDraft?.name || ""}
                          onChange={(e) =>
                            setHospitalDraft((prev: any) => ({ ...prev, name: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hospitalPhone">Phone Number</Label>
                        <Input
                          id="hospitalPhone"
                          value={hospitalDraft?.phone || ""}
                          onChange={(e) =>
                            setHospitalDraft((prev: any) => ({ ...prev, phone: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hospitalEmail">Email Address</Label>
                      <Input
                        id="hospitalEmail"
                        type="email"
                        value={hospitalDraft?.email || ""}
                        onChange={(e) =>
                          setHospitalDraft((prev: any) => ({ ...prev, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hospitalAddress">Address</Label>
                      <Textarea
                        id="hospitalAddress"
                        value={hospitalDraft?.address || ""}
                        onChange={(e) =>
                          setHospitalDraft((prev: any) => ({ ...prev, address: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditHospital(false)
                          setHospitalDraft(settings?.hospital)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!db || !settings) return
                          if (!hospitalDraft) return
                          const newSettings = { ...settings, hospital: hospitalDraft }
                          await setDoc(doc(db, "system", "settings"), newSettings)
                          setSettings(newSettings)
                          setEditHospital(false)
                          toast({ title: "Hospital info updated" })
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground font-semibold">Hospital Name</p>
                        <p className="text-lg">{settings.hospital.name || <span className="text-muted-foreground">Not set</span>}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-semibold">Phone Number</p>
                        <p className="text-lg">{settings.hospital.phone || <span className="text-muted-foreground">Not set</span>}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-semibold">Email Address</p>
                      <p className="text-lg">{settings.hospital.email || <span className="text-muted-foreground">Not set</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-semibold">Address</p>
                      <p className="text-lg">{settings.hospital.address || <span className="text-muted-foreground">Not set</span>}</p>
                    </div>
                    <Button className="mt-2" onClick={() => setEditHospital(true)}>
                      Edit
                    </Button>
                  </>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{totalPatients}</p>
                    <p className="text-sm text-muted-foreground">Total Patients</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{totalStaff}</p>
                    <p className="text-sm text-muted-foreground">Total Staff</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{totalBeds}</p>
                    <p className="text-sm text-muted-foreground">Total Beds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="shadow-sm hover:shadow-lg hover:border-border transition-shadow">
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
                    <p className="text-sm text-muted-foreground">Passwords must contain special characters</p>
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
                    <p className="text-sm text-muted-foreground">Passwords must contain numbers</p>
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
                    <p className="text-sm text-muted-foreground">Enable 2FA for all users</p>
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
                <div className="mt-4 p-4 bg-card rounded">
                  <p className="text-sm text-foreground">
                    <strong>Current Policy:</strong> Min Length: {settings.security.passwordPolicy.minLength}, 
                    Special Chars: {settings.security.passwordPolicy.requireSpecialChars ? "Yes" : "No"}, 
                    Numbers: {settings.security.passwordPolicy.requireNumbers ? "Yes" : "No"}, 
                    2FA: {settings.security.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup">
            <Card>
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
                    <p className="text-sm text-muted-foreground">Enable automatic system backups</p>
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
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button onClick={handleBackup} variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Create Backup Now
                  </Button>
                  <Button onClick={handleCreateBackup} variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Create & Download Backup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Import Staff Data</h3>
                    <p className="text-sm text-muted-foreground">Import staff from Excel (.xlsx) file. Download the template for correct format.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleDownloadTemplate}>
                        Download Excel Template
                      </Button>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleImportStaff}
                        className="block w-full text-sm text-muted-foreground
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-card file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Export Overview as PDF</h3>
                    <p className="text-sm text-muted-foreground">Download a PDF summary of hospital settings and analytics.</p>
                    <Button variant="outline" onClick={handleExportPDF}>
                      Export Overview PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Admin Billing Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Bed Charge (₹)</Label>
                <Input type="number" value={settings.billing?.bedCharge ?? 1000} min={0} onChange={e => setSettings(s => s ? { ...s, billing: { ...s.billing, bedCharge: Number(e.target.value) } } : s)} />
              </div>
              <div>
                <Label>Consultation Charge (₹)</Label>
                <Input type="number" value={settings.billing?.consultationCharge ?? 500} min={0} onChange={e => setSettings(s => s ? { ...s, billing: { ...s.billing, consultationCharge: Number(e.target.value) } } : s)} />
              </div>
              <div>
                <Label>Service Types</Label>
                <div className="space-y-2">
                  {(settings.billing?.serviceTypes ?? []).map((service, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input value={service.name} onChange={e => setSettings(s => {
                        if (!s) return s;
                        const updated = [...(s.billing?.serviceTypes ?? [])];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        return { ...s, billing: { ...s.billing, serviceTypes: updated } };
                      })} placeholder="Service Name" className="w-48" />
                      <Input type="number" value={service.defaultPrice} min={0} onChange={e => setSettings(s => {
                        if (!s) return s;
                        const updated = [...(s.billing?.serviceTypes ?? [])];
                        updated[idx] = { ...updated[idx], defaultPrice: Number(e.target.value) };
                        return { ...s, billing: { ...s.billing, serviceTypes: updated } };
                      })} className="w-32" />
                      <Button size="sm" variant="destructive" onClick={() => setSettings(s => {
                        if (!s) return s;
                        const updated = (s.billing?.serviceTypes ?? []).filter((_, i) => i !== idx);
                        return { ...s, billing: { ...s.billing, serviceTypes: updated } };
                      })}>Remove</Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setSettings(s => {
                    if (!s) return s;
                    const updated = [...(s.billing?.serviceTypes ?? []), { name: "", defaultPrice: 0 }];
                    return { ...s, billing: { ...s.billing, serviceTypes: updated } };
                  })}>Add Service Type</Button>
                </div>
              </div>
              <Button className="mt-4" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Billing Settings"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
