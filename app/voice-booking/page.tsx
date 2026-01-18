"use client"
// ✅ BROWSER-NATIVE VOICE BOOKING - NO LIVEKIT - Build: 20260117-v2
// Uses ONLY Web Speech API (SpeechRecognition + SpeechSynthesis)

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume2, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

// Conversation steps
const STEPS = {
  GREETING: 0,
  ASK_INTENT: 1,
  ASK_DEPARTMENT: 2,
  ASK_DATE: 3,
  ASK_TIME: 4,
  CONFIRM: 5,
  COMPLETE: 6
}

const PROMPTS = {
  [STEPS.GREETING]: "Hello! Welcome to SwasthyaSetu. How can I help you today?",
  [STEPS.ASK_INTENT]: "Would you like to book an appointment?",
  [STEPS.ASK_DEPARTMENT]: "Which department would you like to visit? For example: Cardiology, Neurology, or Orthopedics.",
  [STEPS.ASK_DATE]: "What date would work for you? You can say tomorrow, or a specific date.",
  [STEPS.ASK_TIME]: "What time would be convenient? You can say morning, afternoon, or a specific time.",
  [STEPS.CONFIRM]: "Let me confirm your appointment details.",
  [STEPS.COMPLETE]: "Your appointment has been booked successfully! You'll receive a confirmation shortly."
}

export default function VoiceBookingPage() {
  const router = useRouter()
  const [isSupported, setIsSupported] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentStep, setCurrentStep] = useState(STEPS.GREETING)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  
  // Appointment data
  const [appointmentData, setAppointmentData] = useState({
    department: "",
    date: "",
    time: ""
  })

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const isRecognitionActive = useRef(false)
  const autoListenTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 3

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition || !window.speechSynthesis) {
      setIsSupported(false)
      setError("Your browser doesn't support voice features. Please use Chrome or Edge.")
      return
    }

    // Initialize Speech Recognition (STT) with more stable settings
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = 'en-US' // Use en-US for better stability
    recognitionRef.current.maxAlternatives = 1

    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started')
      retryCountRef.current = 0 // Reset retry count on successful start
    }

    recognitionRef.current.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript
      console.log('Speech recognized:', speechResult)
      setTranscript(speechResult)
      retryCountRef.current = 0 // Reset retry count on success
      processUserInput(speechResult)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.log('Speech recognition error:', event.error, 'Retry count:', retryCountRef.current)
      isRecognitionActive.current = false
      setIsListening(false)
      
      if (event.error === 'no-speech') {
        // Retry automatically for no-speech errors
        if (retryCountRef.current < maxRetries && currentStep !== STEPS.COMPLETE) {
          retryCountRef.current++
          console.log(`No speech detected, retrying... (${retryCountRef.current}/${maxRetries})`)
          setTimeout(() => startListening(), 1500)
          return
        }
        setError('No speech detected. Speaking again...')
        // Re-speak the current prompt
        setTimeout(() => speakText(PROMPTS[currentStep]), 1000)
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable microphone permissions in your browser.')
      } else if (event.error === 'network') {
        // Retry with exponential backoff
        if (retryCountRef.current < maxRetries && currentStep !== STEPS.COMPLETE) {
          retryCountRef.current++
          const delay = Math.min(3000 * Math.pow(2, retryCountRef.current - 1), 10000)
          console.log(`Network error, retrying in ${delay}ms... (${retryCountRef.current}/${maxRetries})`)
          setTimeout(() => {
            if (!isRecognitionActive.current && currentStep !== STEPS.COMPLETE) {
              startListening()
            }
          }, delay)
          return
        }
        setError('Having trouble with voice recognition. Speaking again...')
        setTimeout(() => speakText(PROMPTS[currentStep]), 1000)
      } else if (event.error === 'aborted') {
        // Ignore aborted errors
        return
      } else {
        console.error('Unhandled speech error:', event.error)
        if (retryCountRef.current < maxRetries && currentStep !== STEPS.COMPLETE) {
          retryCountRef.current++
          setTimeout(() => startListening(), 2000)
          return
        }
        setError('Having trouble listening. Repeating question...')
        setTimeout(() => speakText(PROMPTS[currentStep]), 1000)
      }
    }

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended')
      isRecognitionActive.current = false
      setIsListening(false)
    }

    // Initialize Speech Synthesis (TTS)
    synthRef.current = window.speechSynthesis

    // Start with greeting after short delay
    setTimeout(() => {
      speakText(PROMPTS[STEPS.GREETING])
    }, 800)

    return () => {
      if (autoListenTimeoutRef.current) {
        clearTimeout(autoListenTimeoutRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  // Text-to-Speech: Speak text aloud
  const speakText = (text: string) => {
    if (!synthRef.current) return

    // Cancel any ongoing speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    utterance.rate = 0.9
    utterance.pitch = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      setError(null) // Clear any errors when speaking
      // Auto-start listening after system speaks with longer 3s delay for stability
      if (currentStep !== STEPS.COMPLETE && !isRecognitionActive.current) {
        autoListenTimeoutRef.current = setTimeout(() => {
          console.log('Auto-starting listening after speech...')
          startListening()
        }, 3000) // 3 second delay for better reliability
      }
    }
    utterance.onerror = () => setIsSpeaking(false)

    synthRef.current.speak(utterance)
  }

  // Speech-to-Text: Start listening to user
  const startListening = () => {
    if (!recognitionRef.current) return
    
    // Prevent starting if already active
    if (isRecognitionActive.current) {
      console.log('Recognition already active, skipping start')
      return
    }
    
    setError(null)
    setTranscript("")
    
    try {
      recognitionRef.current.start()
      isRecognitionActive.current = true
      setIsListening(true)
    } catch (err: any) {
      console.error('Error starting recognition:', err)
      isRecognitionActive.current = false
      if (err.message && err.message.includes('already started')) {
        // Recognition is already running, just update UI
        setIsListening(true)
      } else {
        setError('Failed to start listening. Please try again.')
      }
    }
  }

  // Stop listening
  const stopListening = () => {
    // Clear any pending auto-listen
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current)
      autoListenTimeoutRef.current = null
    }
    
    if (recognitionRef.current && isRecognitionActive.current) {
      try {
        recognitionRef.current.stop()
      } catch (err) {
        console.error('Error stopping recognition:', err)
      }
    }
    isRecognitionActive.current = false
    setIsListening(false)
  }

  // Process user input and advance conversation
  const processUserInput = (input: string) => {
    const lowerInput = input.toLowerCase()

    switch (currentStep) {
      case STEPS.GREETING:
      case STEPS.ASK_INTENT:
        if (lowerInput.includes('appointment') || lowerInput.includes('book') || lowerInput.includes('yes')) {
          setCurrentStep(STEPS.ASK_DEPARTMENT)
          speakText(PROMPTS[STEPS.ASK_DEPARTMENT])
        } else {
          speakText("I can help you book an appointment. Would you like to proceed?")
        }
        break

      case STEPS.ASK_DEPARTMENT:
        setAppointmentData(prev => ({ ...prev, department: input }))
        setCurrentStep(STEPS.ASK_DATE)
        speakText(PROMPTS[STEPS.ASK_DATE])
        break

      case STEPS.ASK_DATE:
        setAppointmentData(prev => ({ ...prev, date: input }))
        setCurrentStep(STEPS.ASK_TIME)
        speakText(PROMPTS[STEPS.ASK_TIME])
        break

      case STEPS.ASK_TIME:
        setAppointmentData(prev => ({ ...prev, time: input }))
        setCurrentStep(STEPS.CONFIRM)
        const confirmMsg = `Let me confirm: ${appointmentData.department} department, on ${input} at ${input}. Should I book this appointment?`
        speakText(confirmMsg)
        break

      case STEPS.CONFIRM:
        if (lowerInput.includes('yes') || lowerInput.includes('confirm') || lowerInput.includes('correct')) {
          setCurrentStep(STEPS.COMPLETE)
          speakText(PROMPTS[STEPS.COMPLETE])
        } else {
          speakText("Let's start over. Which department would you like?")
          setCurrentStep(STEPS.ASK_DEPARTMENT)
          setAppointmentData({ department: "", date: "", time: "" })
        }
        break
    }
  }

  // Restart conversation
  const restartConversation = () => {
    setCurrentStep(STEPS.GREETING)
    setAppointmentData({ department: "", date: "", time: "" })
    setTranscript("")
    setError(null)
    speakText(PROMPTS[STEPS.GREETING])
  }

  if (!isSupported) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900 dark:text-red-100">Browser Not Supported</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-800 dark:text-red-200 mb-4">
              {error || "Your browser doesn't support voice features. Please use Google Chrome or Microsoft Edge."}
            </p>
            <Button onClick={() => router.push("/dashboard/patient/appointments/book")}>
              Use Manual Booking
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="glass-card bg-card backdrop-blur-xl shadow-lg border-2 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-6 rounded-full transition-colors ${
              isListening ? 'bg-red-100 dark:bg-red-900 animate-pulse' :
              isSpeaking ? 'bg-blue-100 dark:bg-blue-900' :
              'bg-emerald-100 dark:bg-emerald-900'
            }`}>
              {isListening ? (
                <Mic className="h-12 w-12 text-red-600 dark:text-red-400" />
              ) : isSpeaking ? (
                <Volume2 className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              ) : (
                <Mic className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl">Voice Appointment Booking</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {isListening ? "🎙️ Listening... Speak now" : isSpeaking ? "🔊 Assistant speaking..." : "⏳ Processing..."}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current System Message */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-violet-50 dark:from-emerald-900/20 dark:to-violet-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Volume2 className="h-5 w-5 text-emerald-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-100 mb-1">
                  Assistant:
                </p>
                <p className="text-sm">
                  {PROMPTS[currentStep]}
                </p>
              </div>
            </div>
          </div>

          {/* User Transcript */}
          {transcript && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Mic className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                    You said:
                  </p>
                  <p className="text-sm">{transcript}</p>
                </div>
              </div>
            </div>
          )}

          {/* Appointment Summary */}
          {(appointmentData.department || appointmentData.date || appointmentData.time) && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <p className="font-semibold text-sm mb-2">Appointment Details:</p>
              <div className="space-y-1 text-sm">
                {appointmentData.department && <p>• Department: <span className="font-medium">{appointmentData.department}</span></p>}
                {appointmentData.date && <p>• Date: <span className="font-medium">{appointmentData.date}</span></p>}
                {appointmentData.time && <p>• Time: <span className="font-medium">{appointmentData.time}</span></p>}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {currentStep === STEPS.COMPLETE && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Booking Complete!
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Your appointment for {appointmentData.department} on {appointmentData.date} at {appointmentData.time} has been confirmed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-3">
            {currentStep !== STEPS.COMPLETE ? (
              <>
                <Button
                  onClick={stopListening}
                  disabled={!isListening}
                  className="flex-1"
                  variant="destructive"
                >
                  {isListening ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" />
                      Stop Listening
                    </>
                  ) : isSpeaking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please Wait...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Waiting...
                    </>
                  )}
                </Button>
                <Button
                  onClick={restartConversation}
                  variant="outline"
                  disabled={isSpeaking || isListening}
                >
                  Restart
                </Button>
              </>
            ) : (
              <>
                <Button onClick={restartConversation} className="flex-1">
                  Book Another
                </Button>
                <Button
                  onClick={() => router.push("/dashboard/patient")}
                  variant="outline"
                >
                  Go to Dashboard
                </Button>
              </>
            )}
          </div>

          {/* Manual Booking Fallback */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Prefer typing?
            </p>
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/patient/appointments/book")}
            >
              Switch to Manual Booking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

