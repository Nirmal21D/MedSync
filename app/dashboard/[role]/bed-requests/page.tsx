"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Bed, User, Calendar, Clock, AlertCircle } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Appointment, Bed as BedType } from "@/lib/types"
import { getPendingBedRequests, assignBedToPatient } from "@/lib/bed-assignment"

export default function BedRequestsPage({ params }: { params: Promise<{ role: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<string>("")
  const [pendingRequests, setPendingRequests] = useState<Appointment[]>([])
  const [beds, setBeds] = useState<BedType[]>([])
  const [selectedRequest, setSelectedRequest] = useState<Appointment | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedBedId, setSelectedBedId] = useState("")
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    (async () => {
      const resolvedParams = await params
      setRole(resolvedParams.role)
    })()
  }, [params])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
    fetchData()
  }, [user, loading, router])

  const fetchData = async () => {
    try {
      // Fetch pending bed requests
      const requests = await getPendingBedRequests()
      setPendingRequests(requests)

      // Fetch available beds
      if (db) {
        const bedsQuery = query(
          collection(db, "beds"),
          where("status", "==", "available")
        )
        const bedsSnapshot = await getDocs(bedsQuery)
        setBeds(bedsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as BedType)))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const handleAssignBed = async () => {
    if (!selectedRequest || !selectedBedId || !user) return

    setAssigning(true)
    try {
      await assignBedToPatient(
        selectedBedId,
        selectedRequest.patientId,
        selectedRequest.id,
        200 // bedRatePerDay - can be made configurable
      )

      toast({
        title: "Bed Assigned",
        description: `Bed assigned to ${selectedRequest.patientName} successfully`,
      })

      setShowAssignDialog(false)
      setSelectedRequest(null)
      setSelectedBedId("")
      await fetchData() // Refresh data
    } catch (error: any) {
      console.error("Error assigning bed:", error)
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign bed. Please try again.",
        variant: "destructive"
      })
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pending Bed Requests</h1>
          <p className="text-muted-foreground">Review and assign beds for patients requested by doctors</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Pending Requests</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting bed assignment</p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Available Beds</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{beds.length}</div>
              <p className="text-xs text-muted-foreground">Ready for assignment</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests */}
        <Card className="glass-card bg-card backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground">Bed Requests</CardTitle>
            <CardDescription className="text-muted-foreground">
              Patients requested by doctors for bed assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending bed requests.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{request.patientName}</h3>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Pending
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              UHID: {request.uhid}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Doctor: {request.doctorName}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(request.appointmentDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {request.timeSlot}
                            </div>
                          </div>
                          {request.reason && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                              <strong>Reason:</strong> {request.reason}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedRequest(request)
                            setShowAssignDialog(true)
                          }}
                          className="ml-4"
                        >
                          <Bed className="h-4 w-4 mr-2" />
                          Assign Bed
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign Bed Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="glass-card bg-card backdrop-blur-xl shadow-lg">
            <DialogHeader>
              <DialogTitle>Assign Bed to {selectedRequest?.patientName}</DialogTitle>
              <DialogDescription>
                Select an available bed for this patient
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Available Beds</Label>
                <Select value={selectedBedId} onValueChange={setSelectedBedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bed" />
                  </SelectTrigger>
                  <SelectContent>
                    {beds.length === 0 ? (
                      <div className="px-4 py-2 text-muted-foreground">No available beds</div>
                    ) : (
                      beds.map((bed) => (
                        <SelectItem key={bed.id} value={bed.id}>
                          {bed.number} - {bed.ward} ({bed.type})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedRequest && (
                <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                  <div><strong>Patient:</strong> {selectedRequest.patientName}</div>
                  <div><strong>UHID:</strong> {selectedRequest.uhid}</div>
                  <div><strong>Doctor:</strong> {selectedRequest.doctorName}</div>
                  <div><strong>Department:</strong> {selectedRequest.department}</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignBed} 
                  disabled={!selectedBedId || assigning || beds.length === 0}
                >
                  {assigning ? "Assigning..." : "Assign Bed"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
