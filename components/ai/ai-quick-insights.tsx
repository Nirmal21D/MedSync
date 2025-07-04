"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, AlertTriangle, Users, Activity } from "lucide-react"
import { aiHealthcare } from "@/lib/gemini"
import type { Patient } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

interface AIQuickInsightsProps {
  patients: Patient[]
  className?: string
}

interface QuickInsight {
  type: 'high-risk' | 'critical' | 'medication-alert' | 'trend'
  title: string
  description: string
  count?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  patientId?: string
}

export default function AIQuickInsights({ patients, className }: AIQuickInsightsProps) {
  const [insights, setInsights] = useState<QuickInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateQuickInsights = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const newInsights: QuickInsight[] = []
        
        // Process a subset of patients to avoid API rate limits
        const samplePatients = patients.slice(0, 5) // Limit to 5 patients for demo
        
        for (const patient of samplePatients) {
          try {
            const riskCheck = await aiHealthcare.quickRiskCheck(patient)
            
            if (riskCheck.isHighRisk) {
              const riskScore = Math.min(Math.round(riskCheck.score), 100); // Cap at 100%
              const actionCount = riskCheck.actions?.length || 0;
              
              newInsights.push({
                type: 'high-risk',
                title: `High Risk: ${patient.name}`,
                description: `${riskCheck.level} risk level (${riskScore}%) - ${actionCount} recommended actions`,
                severity: riskCheck.level.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
                patientId: patient.id
              })
            }
          } catch (err) {
            console.error(`Error processing patient ${patient.id}:`, err)
          }
        }
        
        // Add summary insights
        const criticalCount = patients.filter(p => p.status === 'critical').length
        if (criticalCount > 0) {
          newInsights.push({
            type: 'critical',
            title: 'Critical Patients Alert',
            description: `${criticalCount} patient${criticalCount > 1 ? 's' : ''} in critical condition requiring immediate attention`,
            count: criticalCount,
            severity: 'critical'
          })
        }
        
        // Add vitals monitoring alerts
        const abnormalVitals = patients.filter(p => {
          if (!p.vitals) return false;
          const temp = p.vitals.temperature || 0;
          const hr = p.vitals.heartRate || 0;
          const o2 = p.vitals.oxygenSaturation || 100;
          return temp > 100.4 || temp < 95 || hr > 100 || hr < 60 || o2 < 95;
        }).length;
        
        if (abnormalVitals > 0) {
          newInsights.push({
            type: 'medication-alert',
            title: 'Abnormal Vitals',
            description: `${abnormalVitals} patient${abnormalVitals > 1 ? 's' : ''} with concerning vital signs require monitoring`,
            count: abnormalVitals,
            severity: 'high'
          })
        }

        // Add general trends
        const admittedCount = patients.filter(p => p.status === 'admitted').length
        if (admittedCount > 0) {
          newInsights.push({
            type: 'trend',
            title: 'Current Census',
            description: `${admittedCount} patient${admittedCount > 1 ? 's' : ''} currently admitted and under care`,
            count: admittedCount,
            severity: 'medium'
          })
        }
        
        // If no high-risk insights, add some positive/informational ones
        if (newInsights.filter(i => i.type === 'high-risk').length === 0 && patients.length > 0) {
          newInsights.push({
            type: 'trend',
            title: 'Patient Status Overview',
            description: `All patients appear stable - no high-risk cases detected in recent assessment`,
            severity: 'low'
          })
        }
        
        setInsights(newInsights)
      } catch (err) {
        console.error('Error generating AI insights:', err)
        setError('Failed to generate AI insights. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (patients.length > 0) {
      generateQuickInsights()
    } else {
      setLoading(false)
    }
  }, [patients])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'high-risk': return <AlertTriangle className="h-4 w-4" />
      case 'critical': return <Activity className="h-4 w-4" />
      case 'medication-alert': return <AlertTriangle className="h-4 w-4" />
      case 'trend': return <TrendingUp className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            AI Quick Insights
          </CardTitle>
          <CardDescription>AI-powered patient monitoring and alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
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
          AI Quick Insights
        </CardTitle>
        <CardDescription>
          AI-powered patient monitoring and alerts ({insights.length} insights)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Brain className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No critical insights at the moment.</p>
            <p className="text-sm">All patients appear to be stable.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-shrink-0 mt-1">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {insight.title}
                    </p>
                    <Badge variant={getSeverityColor(insight.severity)}>
                      {insight.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {insights.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full">
              View Detailed AI Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
