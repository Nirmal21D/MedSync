"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Brain, TrendingUp, Shield, Lightbulb } from "lucide-react"
import { aiHealthcare } from "@/lib/gemini"
import type { Patient, NursingNote } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

interface AIPatientInsightsProps {
  patient: Patient
  nursingNotes?: NursingNote[]
  className?: string
}

interface RiskAssessment {
  isHighRisk: boolean
  score: number
  level: string
  actions: string[]
}

interface CareInsights {
  priorityConcerns: string[]
  recommendations: string[]
  alerts: string[]
}

export default function AIPatientInsights({ patient, nursingNotes = [], className }: AIPatientInsightsProps) {
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null)
  const [careInsights, setCareInsights] = useState<CareInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAIInsights = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get AI-powered risk assessment
        const risk = await aiHealthcare.quickRiskCheck(patient)
        setRiskAssessment(risk)

        // Get care insights if nursing notes are available
        if (nursingNotes.length > 0) {
          const insights = await aiHealthcare.getCareInsights(patient, nursingNotes)
          setCareInsights(insights)
        }
      } catch (err) {
        console.error('Error fetching AI insights:', err)
        setError('Failed to load AI insights. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchAIInsights()
  }, [patient, nursingNotes])

  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'secondary'
      case 'LOW': return 'outline'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            AI Patient Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            AI Insights Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="mr-2 h-5 w-5" />
          AI Patient Insights
        </CardTitle>
        <CardDescription>AI-powered risk assessment and care recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Assessment */}
        {riskAssessment && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center">
                <Shield className="mr-2 h-4 w-4" />
                Risk Assessment
              </h4>
              <Badge variant={getRiskColor(riskAssessment.level)}>
                {riskAssessment.level} Risk ({Math.round(riskAssessment.score * 100)}%)
              </Badge>
            </div>
            
            {riskAssessment.isHighRisk && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High-risk patient requiring enhanced monitoring and care protocols.
                </AlertDescription>
              </Alert>
            )}

            {riskAssessment.actions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Recommended Actions:</p>
                <ul className="text-sm space-y-1">
                  {riskAssessment.actions.map((action, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Care Insights */}
        {careInsights && (
          <div className="space-y-4">
            {careInsights.priorityConcerns.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center mb-2">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Priority Concerns
                </h4>
                <div className="space-y-1">
                  {careInsights.priorityConcerns.map((concern, index) => (
                    <Badge key={index} variant="secondary" className="mr-2 mb-1">
                      {concern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {careInsights.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center mb-2">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Care Recommendations
                </h4>
                <ul className="text-sm space-y-1">
                  {careInsights.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {careInsights.alerts.length > 0 && (
              <div>
                <h4 className="font-medium text-amber-600 mb-2">Communication Alerts</h4>
                {careInsights.alerts.map((alert, index) => (
                  <Alert key={index} className="mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{alert}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
