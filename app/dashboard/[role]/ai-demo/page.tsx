"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Brain, Stethoscope, Pill, TrendingUp, Users, AlertTriangle } from "lucide-react"
import { askGeminiServer, askGeminiJSON, aiHealthcare } from "@/lib/gemini"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AIServiceDemo() {
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [demoData, setDemoData] = useState<any>(null)

  // Sample patient data for demo
  const samplePatient = {
    id: "demo-001",
    uhid: "UHID-202601-00001",
    name: "John Doe",
    age: 65,
    gender: "male" as const,
    phone: "+1234567890",
    email: "john.doe@email.com",
    address: "123 Main St, City, State",
    diagnosis: "Hypertension, Type 2 Diabetes",
    assignedDoctor: "Dr. Smith",
    assignedBed: "A-101",
    vitals: {
      bloodPressure: "145/92",
      heartRate: 88,
      temperature: 99.2,
      oxygenSaturation: 96
    },
    history: ["Previous MI 2019", "Diabetic since 2015"],
    admissionDate: new Date("2024-01-15"),
    status: "admitted" as const
  }

  const testGeminiBasic = async () => {
    setLoading(true)
    try {
      const result = await askGeminiServer(prompt)
      setResponse(result)
    } catch (error) {
      setResponse("Error: " + error)
    } finally {
      setLoading(false)
    }
  }

  const testGeminiJSON = async () => {
    setLoading(true)
    try {
      const result = await askGeminiJSON(
        "Generate a sample patient risk assessment with fields: riskLevel, riskScore, factors, recommendations"
      )
      setDemoData(result)
    } catch (error) {
      setDemoData({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const testRiskAssessment = async () => {
    setLoading(true)
    try {
      const result = await aiHealthcare.quickRiskCheck(samplePatient)
      setDemoData(result)
    } catch (error) {
      setDemoData({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const testMedicationSafety = async () => {
    setLoading(true)
    try {
      const medications = ["Metformin", "Lisinopril", "Aspirin", "Simvastatin"]
      const result = await aiHealthcare.medicationSafetyCheck(medications, samplePatient)
      setDemoData(result)
    } catch (error) {
      setDemoData({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const testDiagnosticAssistance = async () => {
    setLoading(true)
    try {
      const symptoms = ["chest pain", "shortness of breath", "fatigue", "dizziness"]
      const vitals = samplePatient.vitals
      const result = await aiHealthcare.getdiagnosticAssistance(symptoms, vitals)
      setDemoData(result)
    } catch (error) {
      setDemoData({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center">
          <Brain className="mr-3 h-8 w-8" />
          AI Service Integration Demo
        </h1>
        <p className="text-gray-600">
          Test and explore the AI-powered healthcare features integrated with Google Gemini
        </p>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic AI</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="medication">Medication Safety</TabsTrigger>
          <TabsTrigger value="diagnostic">Diagnostic AI</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Gemini AI Integration</CardTitle>
              <CardDescription>
                Test direct communication with Google Gemini AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter your prompt:</label>
                <Textarea
                  placeholder="Ask anything healthcare-related..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={testGeminiBasic} 
                  disabled={loading || !prompt.trim()}
                >
                  {loading ? "Processing..." : "Send to Gemini"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={testGeminiJSON} 
                  disabled={loading}
                >
                  Test JSON Response
                </Button>
              </div>

              {response && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-2">AI Response:</h4>
                  <pre className="whitespace-pre-wrap text-sm">{response}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Patient Risk Assessment
              </CardTitle>
              <CardDescription>
                AI-powered risk analysis for patient care optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium mb-2">Sample Patient:</h4>
                <p><strong>Name:</strong> {samplePatient.name}</p>
                <p><strong>Age:</strong> {samplePatient.age}</p>
                <p><strong>Diagnosis:</strong> {samplePatient.diagnosis}</p>
                <p><strong>Vitals:</strong> BP {samplePatient.vitals.bloodPressure}, HR {samplePatient.vitals.heartRate}, Temp {samplePatient.vitals.temperature}°F</p>
              </div>

              <Button onClick={testRiskAssessment} disabled={loading}>
                {loading ? "Analyzing Risk..." : "Run Risk Assessment"}
              </Button>

              {demoData && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium">Risk Assessment Results:</h4>
                  <pre className="p-4 border rounded-lg bg-gray-50 text-sm overflow-auto">
                    {JSON.stringify(demoData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Pill className="mr-2 h-5 w-5" />
                Medication Safety Analysis
              </CardTitle>
              <CardDescription>
                AI-powered drug interaction and safety checking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-green-50">
                <h4 className="font-medium mb-2">Sample Medications:</h4>
                <div className="flex flex-wrap gap-2">
                  {["Metformin", "Lisinopril", "Aspirin", "Simvastatin"].map(med => (
                    <Badge key={med} variant="outline">{med}</Badge>
                  ))}
                </div>
              </div>

              <Button onClick={testMedicationSafety} disabled={loading}>
                {loading ? "Checking Safety..." : "Check Medication Safety"}
              </Button>

              {demoData && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium">Safety Analysis Results:</h4>
                  <pre className="p-4 border rounded-lg bg-gray-50 text-sm overflow-auto">
                    {JSON.stringify(demoData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Stethoscope className="mr-2 h-5 w-5" />
                Diagnostic Assistance
              </CardTitle>
              <CardDescription>
                AI-powered diagnostic suggestions and clinical decision support
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-yellow-50">
                <h4 className="font-medium mb-2">Sample Symptoms:</h4>
                <div className="flex flex-wrap gap-2">
                  {["chest pain", "shortness of breath", "fatigue", "dizziness"].map(symptom => (
                    <Badge key={symptom} variant="secondary">{symptom}</Badge>
                  ))}
                </div>
              </div>

              <Button onClick={testDiagnosticAssistance} disabled={loading}>
                {loading ? "Analyzing Symptoms..." : "Get Diagnostic Assistance"}
              </Button>

              {demoData && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium">Diagnostic Assistance Results:</h4>
                  <pre className="p-4 border rounded-lg bg-gray-50 text-sm overflow-auto">
                    {JSON.stringify(demoData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick API Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Brain className="mx-auto h-8 w-8 text-green-600 mb-2" />
              <p className="font-medium">Google Gemini</p>
              <Badge variant="outline" className="text-green-600">Connected</Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="mx-auto h-8 w-8 text-blue-600 mb-2" />
              <p className="font-medium">AI Healthcare Functions</p>
              <Badge variant="outline" className="text-blue-600">Ready</Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Users className="mx-auto h-8 w-8 text-purple-600 mb-2" />
              <p className="font-medium">Patient Integration</p>
              <Badge variant="outline" className="text-purple-600">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This AI integration is for demonstration and development purposes. 
          In production, ensure proper data privacy compliance, API rate limiting, error handling, and 
          clinical validation of all AI-generated recommendations.
        </AlertDescription>
      </Alert>
    </div>
  )
}
