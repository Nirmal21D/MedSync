"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Stethoscope, Plus, X, AlertTriangle } from "lucide-react"
import { aiHealthcare } from "@/lib/gemini"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

interface AIDiagnosticAssistantProps {
  className?: string
}

interface DiagnosticResult {
  topDiagnoses: Array<{
    condition: string
    probability: number
    reasoning: string
  }>
  urgency: string
  tests: string[]
  redFlags: string[]
}

export default function AIDiagnosticAssistant({ className }: AIDiagnosticAssistantProps) {
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [newSymptom, setNewSymptom] = useState("")
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    oxygenSaturation: ""
  })
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addSymptom = () => {
    if (newSymptom.trim() && !symptoms.includes(newSymptom.trim())) {
      setSymptoms([...symptoms, newSymptom.trim()])
      setNewSymptom("")
    }
  }

  const removeSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom))
  }

  const handleVitalChange = (key: string, value: string) => {
    setVitals(prev => ({ ...prev, [key]: value }))
  }

  const getDiagnosticAssistance = async () => {
    if (symptoms.length === 0) {
      setError("Please add at least one symptom")
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const result = await aiHealthcare.getdiagnosticAssistance(symptoms, vitals)
      setDiagnosticResult(result)
    } catch (err) {
      console.error('Error getting diagnostic assistance:', err)
      setError('Failed to get diagnostic assistance. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toUpperCase()) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'secondary'
      case 'LOW': return 'outline'
      default: return 'outline'
    }
  }

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'destructive'
    if (probability >= 0.5) return 'secondary'
    return 'outline'
  }

  return (
    <Card className={`glass-card bg-card backdrop-blur-xl shadow-lg ${className || ''}`.trim()}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Stethoscope className="mr-2 h-5 w-5" />
          AI Diagnostic Assistant
        </CardTitle>
        <CardDescription>
          Get AI-powered diagnostic suggestions based on symptoms and vitals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Symptoms Input */}
        <div className="space-y-3">
          <h4 className="font-medium">Symptoms</h4>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter symptom..."
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
            />
            <Button onClick={addSymptom} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom, index) => (
                <Badge key={index} variant="outline" className="pr-1">
                  {symptom}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-2"
                    onClick={() => removeSymptom(symptom)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Vitals Input */}
        <div className="space-y-3">
          <h4 className="font-medium">Vital Signs (Optional)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Blood Pressure</label>
              <Input
                placeholder="120/80"
                value={vitals.bloodPressure}
                onChange={(e) => handleVitalChange('bloodPressure', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Heart Rate</label>
              <Input
                placeholder="72 bpm"
                value={vitals.heartRate}
                onChange={(e) => handleVitalChange('heartRate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Temperature</label>
              <Input
                placeholder="98.6°F"
                value={vitals.temperature}
                onChange={(e) => handleVitalChange('temperature', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Oxygen Saturation</label>
              <Input
                placeholder="98%"
                value={vitals.oxygenSaturation}
                onChange={(e) => handleVitalChange('oxygenSaturation', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Get Assistance Button */}
        <Button
          onClick={getDiagnosticAssistance}
          disabled={loading || symptoms.length === 0}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing Symptoms...
            </>
          ) : (
            <>
              <Stethoscope className="mr-2 h-4 w-4" />
              Get Diagnostic Assistance
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Diagnostic Results */}
        {diagnosticResult && (
          <div className="space-y-4">
            {/* Urgency Assessment */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="font-medium">Urgency Level:</span>
              <Badge variant={getUrgencyColor(diagnosticResult.urgency)}>
                {diagnosticResult.urgency}
              </Badge>
            </div>

            {/* Red Flags */}
            {diagnosticResult.redFlags.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Red Flags Detected:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {diagnosticResult.redFlags.map((flag, index) => (
                      <li key={index}>{flag}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Top Diagnoses */}
            {diagnosticResult.topDiagnoses.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Possible Diagnoses:</h4>
                <div className="space-y-3">
                  {diagnosticResult.topDiagnoses.map((diagnosis, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{diagnosis.condition}</span>
                        <Badge variant={getProbabilityColor(diagnosis.probability)}>
                          {Math.round(diagnosis.probability * 100)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{diagnosis.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Tests */}
            {diagnosticResult.tests.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Recommended Tests:</h4>
                <ul className="text-sm space-y-1">
                  {diagnosticResult.tests.map((test, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> This AI assistance is for informational purposes only. 
                Always use clinical judgment and follow established medical protocols for diagnosis and treatment.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
