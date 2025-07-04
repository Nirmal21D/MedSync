"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Pill, Check, X, Search } from "lucide-react"
import { aiHealthcare } from "@/lib/gemini"
import type { Patient } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

interface AIMedicationCheckerProps {
  patient: Patient
  className?: string
}

interface MedicationSafety {
  isSafe: boolean
  hasCriticalIssues: boolean
  summary: string
  alerts: Array<{
    severity: string
    interaction: string
    description: string
  }>
}

export default function AIMedicationChecker({ patient, className }: AIMedicationCheckerProps) {
  const [medications, setMedications] = useState<string[]>([])
  const [newMedication, setNewMedication] = useState("")
  const [safetyAnalysis, setSafetyAnalysis] = useState<MedicationSafety | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addMedication = () => {
    if (newMedication.trim() && !medications.includes(newMedication.trim())) {
      setMedications([...medications, newMedication.trim()])
      setNewMedication("")
    }
  }

  const removeMedication = (med: string) => {
    setMedications(medications.filter(m => m !== med))
  }

  const checkMedicationSafety = async () => {
    if (medications.length === 0) {
      setError("Please add at least one medication to check")
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const analysis = await aiHealthcare.medicationSafetyCheck(medications, patient)
      setSafetyAnalysis(analysis)
    } catch (err) {
      console.error('Error checking medication safety:', err)
      setError('Failed to analyze medication safety. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'SEVERE': return 'destructive'
      case 'MAJOR': return 'destructive'
      case 'MODERATE': return 'secondary'
      case 'MINOR': return 'outline'
      default: return 'outline'
    }
  }

  const getSafetyIcon = () => {
    if (!safetyAnalysis) return null
    
    if (safetyAnalysis.isSafe && !safetyAnalysis.hasCriticalIssues) {
      return <Check className="h-5 w-5 text-green-600" />
    } else {
      return <X className="h-5 w-5 text-red-600" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Pill className="mr-2 h-5 w-5" />
          AI Medication Safety Checker
        </CardTitle>
        <CardDescription>
          Check for drug interactions and contraindications for {patient.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Medications */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter medication name..."
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addMedication()}
            />
            <Button onClick={addMedication} size="sm">
              Add
            </Button>
          </div>

          {/* Current Medications */}
          {medications.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Medications:</p>
              <div className="flex flex-wrap gap-2">
                {medications.map((med, index) => (
                  <Badge key={index} variant="outline" className="pr-1">
                    {med}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2"
                      onClick={() => removeMedication(med)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Check Safety Button */}
          <Button
            onClick={checkMedicationSafety}
            disabled={loading || medications.length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing Safety...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Check Medication Safety
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Safety Analysis Results */}
        {safetyAnalysis && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                {getSafetyIcon()}
                <span className="font-medium">
                  Safety Status: {safetyAnalysis.summary}
                </span>
              </div>
              {safetyAnalysis.hasCriticalIssues && (
                <Badge variant="destructive">Critical Issues Found</Badge>
              )}
            </div>

            {/* Critical Issues Alert */}
            {safetyAnalysis.hasCriticalIssues && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Critical medication interactions detected. Review immediately before prescribing.
                </AlertDescription>
              </Alert>
            )}

            {/* Interaction Alerts */}
            {safetyAnalysis.alerts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Drug Interactions & Alerts:</h4>
                <div className="space-y-2">
                  {safetyAnalysis.alerts.map((alert, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{alert.interaction}</span>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safe Confirmation */}
            {safetyAnalysis.isSafe && !safetyAnalysis.hasCriticalIssues && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  No critical interactions detected. Medications appear safe for this patient profile.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
