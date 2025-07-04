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
import { cn } from "@/lib/utils"

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
            description: 'All patients appear stable - no high-risk cases detected in recent assessment',
            severity: 'low'
          })
        }
        
        setInsights(newInsights)
      } catch (err) {
        setError('Failed to generate insights.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    generateQuickInsights()
  }, [patients])

  if (loading && insights.length === 0) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (insights.length === 0) {
    return (
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>No insights available.</AlertDescription>
      </Alert>
    )
  }

  const getInsightIcon = (type: QuickInsight['type']) => {
    switch (type) {
      case 'high-risk':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'medication-alert':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5 text-secondary" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: QuickInsight['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card className={`glass-card bg-card backdrop-blur-xl shadow-lg ${className || ''}`.trim()}>
      <CardHeader>
        <CardTitle className="flex items-center text-foreground dark:text-white">
          <Brain className="mr-2 h-5 w-5" />
          AI Quick Insights
        </CardTitle>
        <CardDescription className="text-muted-foreground dark:text-gray-300">
          AI-powered patient monitoring and alerts ({insights.length} insights)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={
              cn(
                "flex items-center justify-between p-4 rounded-lg border text-foreground dark:text-white",
                insight.severity === "critical"
                  ? "border-destructive bg-destructive/5 dark:bg-[#18181b]"
                  : insight.severity === "high"
                  ? "border-destructive bg-destructive/5 dark:bg-[#18181b]"
                  : insight.severity === "medium"
                  ? "border-secondary bg-secondary/10 dark:bg-[#18181b]"
                  : "border-muted bg-muted/10 dark:bg-[#18181b]",
                idx === insights.length - 1 && "mb-0"
              )
            }
          >
            <div className="flex items-center gap-3">
              {getInsightIcon(insight.type)}
              <div>
                <p className="font-semibold text-foreground dark:text-white">{insight.title}</p>
                <p className="text-sm text-muted-foreground dark:text-gray-300">{insight.description}</p>
              </div>
            </div>
            <Badge variant={getSeverityColor(insight.severity)}>{insight.severity}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}