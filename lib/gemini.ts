// lib/gemini.ts - AI-Powered Healthcare Intelligence
import { GoogleGenAI } from '@google/genai';
import type { Patient, Staff, InventoryItem, Prescription, NursingNote } from './types';

const ai = new GoogleGenAI({
  apiKey: "AIzaSyBLKcY7xLjfPjz-bPSDiMcLIx-s7wSsixU",
});

// Base function for Gemini API calls
export async function askGeminiServer(prompt: string): Promise<string> {
  try {
    const config = {
      thinkingConfig: { thinkingBudget: -1 },
      responseMimeType: 'text/plain',
    };
    const model = 'gemini-2.5-pro';
    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });
    
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response received from AI');
    }
    
    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Specialized function for JSON responses
export async function askGeminiJSON(prompt: string): Promise<any> {
  try {
    const config = {
      thinkingConfig: { thinkingBudget: -1 },
      responseMimeType: 'application/json',
    };
    const model = 'gemini-2.5-pro';
    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt + "\n\nIMPORTANT: Respond only with valid JSON, no markdown formatting." }],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });
    
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json|```/g, ''));
  } catch (error) {
    console.error('Gemini JSON Error:', error);
    return {};
  }
}

// ===========================================
// HEALTHCARE AI INTELLIGENCE SERVICES
// ===========================================

// 1. PATIENT RISK ASSESSMENT & PREDICTION
export async function assessPatientRisk(patient: Patient) {
  const prompt = `
As a healthcare AI specialist, analyze this patient's comprehensive data and provide a detailed risk assessment:

PATIENT PROFILE:
- Name: ${patient.name}
- Age: ${patient.age} years
- Gender: ${patient.gender}
- Primary Diagnosis: ${patient.diagnosis}
- Current Status: ${patient.status}
- Admission Date: ${patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString() : 'Not available'}

VITAL SIGNS:
- Blood Pressure: ${patient.vitals?.bloodPressure || 'Not recorded'}
- Heart Rate: ${patient.vitals?.heartRate || 'Not recorded'} bpm
- Temperature: ${patient.vitals?.temperature || 'Not recorded'}°F
- Oxygen Saturation: ${patient.vitals?.oxygenSaturation || 'Not recorded'}%

MEDICAL HISTORY:
${patient.history?.length ? patient.history.join(', ') : 'No significant history recorded'}

NURSING NOTES SUMMARY:
${patient.nursingNotes?.length ? patient.nursingNotes.slice(-3).map(note => `${note.type}: ${note.content}`).join('; ') : 'No recent nursing notes'}

Please provide a comprehensive assessment in this exact JSON format:
{
  "riskScore": [0-100 numerical score],
  "riskLevel": "[LOW|MEDIUM|HIGH|CRITICAL]",
  "riskFactors": ["factor1", "factor2", "factor3"],
  "clinicalConcerns": ["concern1", "concern2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "monitoringPriority": "[ROUTINE|ENHANCED|INTENSIVE]",
  "predictedComplications": [
    {"complication": "name", "probability": "percentage", "timeframe": "when"}
  ],
  "interventionSuggestions": ["intervention1", "intervention2"]
}`;

  return await askGeminiJSON(prompt);
}

// 2. PERSONALIZED TREATMENT PLANNING
export async function generatePersonalizedTreatmentPlan(patient: Patient) {
  const prompt = `
Create a comprehensive, personalized treatment plan for this patient:

PATIENT DATA:
- Age: ${patient.age}, Gender: ${patient.gender}
- Diagnosis: ${patient.diagnosis}
- Current Status: ${patient.status}
- Vitals: BP ${patient.vitals?.bloodPressure}, HR ${patient.vitals?.heartRate}, Temp ${patient.vitals?.temperature}°F, O2 ${patient.vitals?.oxygenSaturation}%
- Medical History: ${patient.history?.join(', ') || 'None recorded'}
- Current Medications: ${patient.nursingNotes?.filter(note => note.type === 'medication').map(note => note.content).join(', ') || 'None recorded'}

Provide a detailed treatment plan in this JSON format:
{
  "treatmentGoals": ["goal1", "goal2", "goal3"],
  "immediateActions": ["action1", "action2"],
  "medications": [
    {
      "name": "medication name",
      "dosage": "dosage amount",
      "frequency": "how often",
      "duration": "how long",
      "purpose": "why prescribed",
      "monitoring": "what to watch for"
    }
  ],
  "procedures": ["procedure1", "procedure2"],
  "lifestyle": ["lifestyle1", "lifestyle2"],
  "dietaryRecommendations": ["diet1", "diet2"],
  "activityLevel": "description",
  "followUpSchedule": [
    {"timeframe": "when", "purpose": "why", "provider": "who"}
  ],
  "patientEducation": ["education1", "education2"],
  "dischargePlanning": ["planning1", "planning2"],
  "warningsAndPrecautions": ["warning1", "warning2"]
}`;

  return await askGeminiJSON(prompt);
}

// 3. INTELLIGENT MEDICATION INTERACTION ANALYSIS
export async function analyzeRedMedicationInteractions(medications: string[], patient: Patient) {
  const prompt = `
As a clinical pharmacist AI, perform a comprehensive medication interaction analysis:

MEDICATIONS TO ANALYZE:
${medications.map((med, i) => `${i + 1}. ${med}`).join('\n')}

PATIENT PROFILE:
- Age: ${patient.age} years
- Gender: ${patient.gender}
- Primary Diagnosis: ${patient.diagnosis}
- Medical History: ${patient.history?.join(', ') || 'None'}
- Current Vitals: BP ${patient.vitals?.bloodPressure}, HR ${patient.vitals?.heartRate}

Analyze for drug interactions, contraindications, and provide recommendations in this JSON format:
{
  "overallSafety": "[SAFE|CAUTION|WARNING|CONTRAINDICATED]",
  "drugInteractions": [
    {
      "severity": "[MINOR|MODERATE|MAJOR|SEVERE]",
      "medications": ["drug1", "drug2"],
      "interaction": "description of interaction",
      "clinicalEffect": "what happens",
      "management": "how to handle",
      "timeframe": "when it occurs"
    }
  ],
  "contraindications": [
    {
      "medication": "drug name",
      "reason": "why contraindicated",
      "alternativeOptions": ["alternative1", "alternative2"]
    }
  ],
  "dosageAdjustments": [
    {
      "medication": "drug name",
      "currentDose": "if known",
      "recommendedDose": "suggested adjustment",
      "reason": "why adjust"
    }
  ],
  "monitoringRequirements": ["lab1", "vital1", "symptom1"],
  "patientCounseling": ["counseling1", "counseling2"],
  "pharmacyNotes": "additional notes for pharmacist"
}`;

  return await askGeminiJSON(prompt);
}

// 4. PREDICTIVE ANALYTICS FOR HOSPITAL OPERATIONS
export async function predictHospitalResourceDemand(currentData: any) {
  const prompt = `
Analyze hospital operational data and predict resource demands for the next 7 days:

CURRENT HOSPITAL DATA:
- Total Patients: ${currentData.totalPatients || 0}
- Critical Patients: ${currentData.criticalPatients || 0}
- Available Beds: ${currentData.availableBeds || 0}
- Staff on Duty: ${currentData.staffOnDuty || 0}
- Current Date: ${new Date().toLocaleDateString()}
- Season: ${new Date().getMonth() < 3 || new Date().getMonth() > 10 ? 'Winter' : new Date().getMonth() < 6 ? 'Spring' : new Date().getMonth() < 9 ? 'Summer' : 'Fall'}

Consider factors like:
- Seasonal illness patterns
- Day-of-week variations
- Emergency trends
- Discharge patterns

Provide predictions in this JSON format:
{
  "bedDemandForecast": [
    {"date": "YYYY-MM-DD", "predictedOccupancy": 85, "confidence": 92}
  ],
  "staffingNeeds": [
    {
      "department": "Emergency",
      "shift": "Day",
      "currentStaff": 10,
      "recommendedStaff": 12,
      "reason": "increased demand predicted"
    }
  ],
  "inventoryForecast": [
    {
      "category": "Medical Supplies",
      "predictedUsage": 150,
      "currentStock": 200,
      "restockRecommendation": "Order within 3 days"
    }
  ],
  "operationalInsights": ["insight1", "insight2", "insight3"],
  "riskAlerts": ["alert1", "alert2"],
  "costOptimization": ["opportunity1", "opportunity2"]
}`;

  return await askGeminiJSON(prompt);
}

// 5. SMART DIAGNOSTIC ASSISTANCE
export async function provideDiagnosticAssistance(symptoms: string[], vitals: any, history: string[]) {
  const prompt = `
As a diagnostic AI assistant, analyze these clinical findings and provide differential diagnosis suggestions:

PRESENTING SYMPTOMS:
${symptoms.map((symptom, i) => `${i + 1}. ${symptom}`).join('\n')}

VITAL SIGNS:
${JSON.stringify(vitals, null, 2)}

MEDICAL HISTORY:
${history.length ? history.join(', ') : 'No significant history'}

Provide diagnostic assistance in this JSON format:
{
  "primaryDifferential": [
    {
      "diagnosis": "condition name",
      "probability": 85,
      "reasoning": "why this is likely",
      "keyFeatures": ["feature1", "feature2"],
      "missingFeatures": ["what else to look for"]
    }
  ],
  "additionalConsiderations": [
    {
      "diagnosis": "alternative condition",
      "probability": 60,
      "reasoning": "why to consider"
    }
  ],
  "recommendedTests": [
    {
      "test": "test name",
      "purpose": "what it will show",
      "urgency": "[STAT|Urgent|Routine]",
      "expectedResults": "what to expect"
    }
  ],
  "urgencyAssessment": {
    "level": "[LOW|MEDIUM|HIGH|EMERGENCY]",
    "reasoning": "why this urgency level",
    "timeframe": "how quickly to act"
  },
  "redFlags": ["symptom1", "finding1"],
  "clinicalPearls": ["pearl1", "pearl2"],
  "patientEducation": ["education1", "education2"]
}`;

  return await askGeminiJSON(prompt);
}

// 6. NURSING CARE OPTIMIZATION
export async function optimizeNursingCare(patient: Patient, nursingNotes: NursingNote[]) {
  const recentNotes = nursingNotes.slice(-10).map(note => 
    `${note.shift} ${note.type} (${note.priority}): ${note.content}`
  ).join('\n');

  const prompt = `
Analyze nursing care patterns and optimize patient care plan:

PATIENT: ${patient.name}, Age ${patient.age}, ${patient.diagnosis}
STATUS: ${patient.status}

RECENT NURSING NOTES:
${recentNotes}

CURRENT VITALS:
${JSON.stringify(patient.vitals, null, 2)}

Provide nursing care optimization in this JSON format:
{
  "carePatterns": [
    {
      "pattern": "observed pattern",
      "trend": "[IMPROVING|STABLE|DECLINING]",
      "significance": "clinical importance"
    }
  ],
  "priorityConcerns": ["concern1", "concern2"],
  "careRecommendations": [
    {
      "intervention": "what to do",
      "frequency": "how often",
      "rationale": "why important",
      "expectedOutcome": "what to expect"
    }
  ],
  "communicationAlerts": ["alert1", "alert2"],
  "shiftHandoffPoints": ["point1", "point2"],
  "familyEducation": ["education1", "education2"],
  "dischargePreparation": ["preparation1", "preparation2"],
  "qualityMetrics": {
    "painManagement": "assessment",
    "mobilityStatus": "assessment",
    "nutritionalStatus": "assessment"
  }
}`;

  return await askGeminiJSON(prompt);
}

// 7. INVENTORY OPTIMIZATION WITH AI
export async function optimizeInventoryManagement(inventory: InventoryItem[], usagePatterns: any[]) {
  const inventoryData = inventory.slice(0, 20).map(item => ({
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    minThreshold: item.minThreshold,
    status: item.status,
    cost: item.cost || 0
  }));

  const prompt = `
Optimize hospital inventory management using AI-driven insights:

CURRENT INVENTORY (Sample):
${JSON.stringify(inventoryData, null, 2)}

USAGE PATTERNS:
- High demand items: Medical supplies, medications
- Seasonal variations: Consider current season
- Emergency preparedness: Maintain safety stock

Provide optimization recommendations in this JSON format:
{
  "criticalStockAlerts": [
    {
      "item": "item name",
      "currentStock": 5,
      "daysUntilStockout": 3,
      "urgency": "[CRITICAL|HIGH|MEDIUM]",
      "recommendedAction": "immediate order quantity"
    }
  ],
  "restockOptimization": [
    {
      "item": "item name",
      "currentStock": 50,
      "optimalOrderQuantity": 100,
      "costBenefit": "savings explanation",
      "orderTiming": "when to order"
    }
  ],
  "costReduction": [
    {
      "opportunity": "cost saving opportunity",
      "potentialSaving": "$500/month",
      "implementation": "how to achieve"
    }
  ],
  "expiryManagement": [
    {
      "item": "item name",
      "expiryAlert": "expires in X days",
      "action": "use first or return to vendor"
    }
  ],
  "demandForecasting": [
    {
      "item": "item name",
      "predictedUsage": "next 30 days",
      "confidence": 85,
      "factors": ["factor1", "factor2"]
    }
  ],
  "vendorOptimization": ["recommendation1", "recommendation2"]
}`;

  return await askGeminiJSON(prompt);
}

// 8. PATIENT OUTCOME PREDICTION
export async function predictPatientOutcomes(patient: Patient) {
  const prompt = `
Predict patient outcomes using clinical data and evidence-based models:

PATIENT PROFILE:
- Name: ${patient.name}
- Age: ${patient.age}, Gender: ${patient.gender}
- Diagnosis: ${patient.diagnosis}
- Status: ${patient.status}
- Admission: ${patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString() : 'Not available'}
- Vitals: ${JSON.stringify(patient.vitals)}
- History: ${patient.history?.join(', ') || 'None'}

Provide outcome predictions in this JSON format:
{
  "lengthOfStay": {
    "predicted": 5,
    "confidenceInterval": {"min": 3, "max": 8},
    "factors": ["age", "diagnosis severity", "comorbidities"]
  },
  "dischargeDate": "2025-07-10",
  "recoveryScore": 78,
  "complicationRisk": {
    "overall": 25,
    "specificRisks": [
      {"complication": "infection", "probability": 15, "prevention": "strict hygiene"},
      {"complication": "readmission", "probability": 10, "mitigation": "follow-up care"}
    ]
  },
  "functionalOutcome": "good recovery expected",
  "qualityOfLife": {
    "shortTerm": "some limitations",
    "longTerm": "near normal",
    "supportNeeds": ["physical therapy", "family support"]
  },
  "costProjection": {
    "totalCost": "$15,000",
    "breakdown": {"medical": 80, "nursing": 15, "ancillary": 5}
  },
  "followUpPlan": [
    {"timeframe": "1 week", "provider": "primary care", "purpose": "wound check"},
    {"timeframe": "1 month", "provider": "specialist", "purpose": "progress assessment"}
  ]
}`;

  return await askGeminiJSON(prompt);
}

// 9. PATIENT ENGAGEMENT PERSONALIZATION
export async function personalizePatientEngagement(patient: Patient, interactions: any[]) {
  const prompt = `
Analyze patient profile and create personalized engagement strategy:

PATIENT: ${patient.name}, Age ${patient.age}, ${patient.gender}
DIAGNOSIS: ${patient.diagnosis}
COMMUNICATION HISTORY: Previous interactions, response patterns

Create personalized engagement plan in this JSON format:
{
  "engagementScore": 75,
  "personalityProfile": "analytical and detail-oriented",
  "communicationPreferences": {
    "preferredChannel": "email",
    "frequency": "weekly",
    "timeOfDay": "morning",
    "style": "formal and detailed"
  },
  "motivationalFactors": ["family well-being", "return to work", "pain relief"],
  "educationStrategy": {
    "learningStyle": "visual",
    "complexity": "intermediate",
    "topics": ["condition management", "medication compliance"]
  },
  "engagementTactics": [
    "provide detailed explanations",
    "use visual aids",
    "include family in discussions",
    "set measurable goals"
  ],
  "complianceFactors": {
    "barriers": ["work schedule", "cost concerns"],
    "enablers": ["family support", "clear instructions"],
    "interventions": ["flexible scheduling", "cost assistance programs"]
  },
  "personalizedMessages": [
    "Good morning ${patient.name}, here's your daily health update...",
    "Remember to take your medication with food as discussed..."
  ]
}`;

  return await askGeminiJSON(prompt);
}

// 10. CLINICAL DECISION SUPPORT
export async function provideClinicalDecisionSupport(scenario: {
  patient: Patient;
  clinicalQuestion: string;
  urgency: 'routine' | 'urgent' | 'emergency';
}) {
  const prompt = `
Provide evidence-based clinical decision support:

CLINICAL SCENARIO:
Patient: ${scenario.patient.name}, Age ${scenario.patient.age}
Diagnosis: ${scenario.patient.diagnosis}
Question: ${scenario.clinicalQuestion}
Urgency: ${scenario.urgency}

Current Status: ${scenario.patient.status}
Vitals: ${JSON.stringify(scenario.patient.vitals)}

Provide clinical guidance in this JSON format:
{
  "clinicalRecommendation": {
    "primaryAction": "main recommendation",
    "alternativeActions": ["option1", "option2"],
    "rationale": "evidence-based reasoning",
    "contraindications": ["contraindication1", "contraindication2"]
  },
  "evidenceLevel": "Level I - Systematic review/meta-analysis",
  "guidelines": [
    {"source": "AHA Guidelines", "recommendation": "specific guidance"},
    {"source": "Clinical Practice", "recommendation": "best practice"}
  ],
  "riskBenefit": {
    "benefits": ["benefit1", "benefit2"],
    "risks": ["risk1", "risk2"],
    "riskMitigation": ["mitigation1", "mitigation2"]
  },
  "monitoring": {
    "parameters": ["parameter1", "parameter2"],
    "frequency": "how often to check",
    "duration": "how long to monitor"
  },
  "consultationNeeded": {
    "specialty": "cardiology",
    "urgency": "within 24 hours",
    "reason": "complex case requiring specialist input"
  },
  "patientEducation": ["education1", "education2"],
  "followUp": "specific follow-up instructions"
}`;

  return await askGeminiJSON(prompt);
}

// ===========================================
// CONVENIENCE FUNCTIONS FOR EASY INTEGRATION
// ===========================================

export const aiHealthcare = {
  // Quick risk assessment
  async quickRiskCheck(patient: Patient) {
    const assessment = await assessPatientRisk(patient);
    return {
      isHighRisk: assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL',
      score: assessment.riskScore,
      level: assessment.riskLevel,
      actions: assessment.recommendations?.slice(0, 3) || []
    };
  },

  // Medication safety check
  async medicationSafetyCheck(medications: string[], patient: Patient) {
    const analysis = await analyzeRedMedicationInteractions(medications, patient);
    return {
      isSafe: analysis.overallSafety === 'SAFE',
      hasCriticalIssues: analysis.drugInteractions?.some((int: any) => int.severity === 'SEVERE') || false,
      summary: analysis.overallSafety,
      alerts: analysis.drugInteractions?.filter((int: any) => int.severity === 'MAJOR' || int.severity === 'SEVERE') || []
    };
  },

  // Smart care suggestions
  async getCareInsights(patient: Patient, notes: NursingNote[]) {
    const insights = await optimizeNursingCare(patient, notes);
    return {
      priorityConcerns: insights.priorityConcerns || [],
      recommendations: insights.careRecommendations?.slice(0, 3) || [],
      alerts: insights.communicationAlerts || []
    };
  },

  // Diagnostic help
  async getdiagnosticAssistance(symptoms: string[], vitals: any) {
    const assistance = await provideDiagnosticAssistance(symptoms, vitals, []);
    return {
      topDiagnoses: assistance.primaryDifferential?.slice(0, 3) || [],
      urgency: assistance.urgencyAssessment?.level || 'MEDIUM',
      tests: assistance.recommendedTests?.slice(0, 3).map((test: any) => 
        typeof test === 'string' ? test : test.test || 'Unknown test'
      ) || [],
      redFlags: assistance.redFlags || []
    };
  }
};