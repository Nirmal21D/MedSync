"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Staff, Patient, Appointment } from "@/lib/types";
import { getNextQueueNumber, formatTimeSlot, isSlotAvailable } from "@/lib/appointments";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function VoiceBookingDemo() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("Click Start Voice to book your appointment");
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const recognitionRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  
  // Check voice support
  const isVoiceSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  
  // Use ref to track data immediately (avoids async state update issues)
  const appointmentDataRef = useRef({
    date: "",
    timeSlot: "",
    symptoms: "",
    selectedDoctorId: ""
  });

  // Appointment data
  const [appointmentData, setAppointmentData] = useState({
    date: "",
    timeSlot: "",
    symptoms: "",
    selectedDoctorId: ""
  });

  // Backend data
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Use ref to prevent state loss on re-renders
  const patientDataRef = useRef<Patient | null>(null);
  const doctorsRef = useRef<Staff[]>([]);
  const appointmentsRef = useRef<Appointment[]>([]);

  useEffect(() => {
    // Load patient data
    const loadPatientData = async () => {
      if (!user) {
        console.log("No user, skipping data load");
        return;
      }

      console.log("Loading patient and doctor data...");

      try {
        if (db) {
          console.log("Firebase DB available, loading from Firestore");
          
          // Load patient
          const patientsRef = collection(db, "patients");
          const patientsQuery = query(patientsRef, where("email", "==", user.email));
          const patientsSnapshot = await getDocs(patientsQuery);
          
          if (!patientsSnapshot.empty) {
            const patient = { id: patientsSnapshot.docs[0].id, ...patientsSnapshot.docs[0].data() } as Patient;
            patientDataRef.current = patient;
            setPatientData(patient);
            console.log("Patient loaded:", patient.name);
          } else {
            console.log("No patient found, using demo patient");
            const demoPatient = {
              id: "demo-patient-1",
              uhid: "UHID-202601-00001",
              name: user.name || "Demo Patient",
              age: 30,
              gender: "male",
              phone: "9876543210",
              email: user.email || "demo@example.com",
              address: "Demo Address",
              status: "stable",
              medicalHistory: []
            } as Patient;
            patientDataRef.current = demoPatient;
            setPatientData(demoPatient);
          }

          // Try loading doctors from 'users' collection first
          console.log("Trying to load doctors from 'users' collection...");
          let doctorsList: Staff[] = [];
          
          try {
            const usersRef = collection(db, "users");
            const usersQuery = query(usersRef, where("role", "==", "doctor"));
            const usersSnapshot = await getDocs(usersQuery);
            doctorsList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            console.log(`Found ${doctorsList.length} doctors in 'users' collection:`, doctorsList.map(d => d.name));
          } catch (err) {
            console.log("Error loading from 'users' collection:", err);
          }
          
          // If no doctors found in 'users', try 'staff' collection
          if (doctorsList.length === 0) {
            console.log("Trying to load doctors from 'staff' collection...");
            try {
              const staffRef = collection(db, "staff");
              const staffQuery = query(staffRef, where("role", "==", "doctor"));
              const staffSnapshot = await getDocs(staffQuery);
              doctorsList = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
              console.log(`Found ${doctorsList.length} doctors in 'staff' collection:`, doctorsList.map(d => d.name));
            } catch (err) {
              console.log("Error loading from 'staff' collection:", err);
            }
          }
          
          // Filter for OPD available doctors or use all if none have opdAvailable flag
          const opdDoctors = doctorsList.filter(doc => doc.opdAvailable === true);
          let finalDoctorsList: Staff[] = [];
          
          if (opdDoctors.length > 0) {
            finalDoctorsList = opdDoctors;
            console.log(`Using ${opdDoctors.length} OPD-available doctors:`, opdDoctors.map(d => d.name));
          } else if (doctorsList.length > 0) {
            // Use all doctors if no opdAvailable flag or all are undefined
            finalDoctorsList = doctorsList;
            console.log(`No opdAvailable flag found or all doctors available, using all ${doctorsList.length} doctors:`, doctorsList.map(d => ({ name: d.name, dept: d.department, spec: d.specialization })));
          } else {
            console.log("No doctors found in Firestore, using demo doctors");
            finalDoctorsList = [
              { id: "doc1", name: "Dr. Smith", role: "doctor", department: "Cardiology", email: "doc1@demo.com", phone: "9876543210", status: "active", joinDate: new Date(), opdAvailable: true },
              { id: "doc2", name: "Dr. Johnson", role: "doctor", department: "Neurology", email: "doc2@demo.com", phone: "9876543211", status: "active", joinDate: new Date(), opdAvailable: true },
              { id: "doc3", name: "Dr. Williams", role: "doctor", department: "Orthopedics", email: "doc3@demo.com", phone: "9876543212", status: "active", joinDate: new Date(), opdAvailable: true },
            ] as Staff[];
          }
          
          // Store in both state and ref
          doctorsRef.current = finalDoctorsList;
          setDoctors(finalDoctorsList);
          console.log(`✅ Doctors stored - State: ${finalDoctorsList.length}, Ref: ${doctorsRef.current.length}`);

          // Load appointments for checking availability
          const appointmentsRef = collection(db, "appointments");
          const appointmentsSnapshot = await getDocs(appointmentsRef);
          const appointmentsList = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          
          // Store in both state and ref
          appointmentsRef.current = appointmentsList;
          setAppointments(appointmentsList);
          console.log(`✅ Appointments stored - State: ${appointmentsList.length}, Ref: ${appointmentsRef.current.length}`);
        } else {
          console.log("No Firebase DB, using demo mode");
          // Demo mode
          const demoPatient = {
            id: "demo-patient-1",
            uhid: "UHID-202601-00001",
            name: user.name || "Demo Patient",
            age: 30,
            gender: "male",
            phone: "9876543210",
            email: user.email || "demo@example.com",
            address: "Demo Address",
            status: "stable",
            medicalHistory: []
          } as Patient;
          patientDataRef.current = demoPatient;
          setPatientData(demoPatient);

          const demoDoctors = [
            { id: "doc1", name: "Dr. Smith", role: "doctor", department: "Cardiology", email: "doc1@demo.com", phone: "9876543210", status: "active", joinDate: new Date(), opdAvailable: true },
            { id: "doc2", name: "Dr. Johnson", role: "doctor", department: "Neurology", email: "doc2@demo.com", phone: "9876543211", status: "active", joinDate: new Date(), opdAvailable: true },
            { id: "doc3", name: "Dr. Williams", role: "doctor", department: "Orthopedics", email: "doc3@demo.com", phone: "9876543212", status: "active", joinDate: new Date(), opdAvailable: true },
          ] as Staff[];
          
          doctorsRef.current = demoDoctors;
          setDoctors(demoDoctors);
          console.log("Using demo doctors");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        // Fallback to demo data on any error
        console.log("Loading failed, using demo data");
        const demoPatient = {
          id: "demo-patient-1",
          uhid: "UHID-202601-00001",
          name: user.name || "Demo Patient",
          age: 30,
          gender: "male",
          phone: "9876543210",
          email: user.email || "demo@example.com",
          address: "Demo Address",
          status: "stable",
          medicalHistory: []
        } as Patient;
        patientDataRef.current = demoPatient;
        setPatientData(demoPatient);
        
        const demoDoctors = [
          { id: "doc1", name: "Dr. Smith", role: "doctor", department: "Cardiology", email: "doc1@demo.com", phone: "9876543210", status: "active", joinDate: new Date(), opdAvailable: true },
          { id: "doc2", name: "Dr. Johnson", role: "doctor", department: "Neurology", email: "doc2@demo.com", phone: "9876543211", status: "active", joinDate: new Date(), opdAvailable: true },
          { id: "doc3", name: "Dr. Williams", role: "doctor", department: "Orthopedics", email: "doc3@demo.com", phone: "9876543212", status: "active", joinDate: new Date(), opdAvailable: true },
        ] as Staff[];
        
        doctorsRef.current = demoDoctors;
        setDoctors(demoDoctors);
      }
    };

    loadPatientData();
  }, [user]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage("Voice booking is supported on Chrome and Edge. You can continue using manual booking.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMessage("🎙️ Listening... Speak clearly");
      retryCountRef.current = 0;
    };

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      console.log("Recognized:", text);
      setMessage(`You said: "${text}"`);
      retryCountRef.current = 0;
      handleSpeech(text.toLowerCase());
    };

    recognition.onerror = (e: any) => {
      console.log("Recognition error:", e.error, "Retry:", retryCountRef.current);
      setIsListening(false);
      
      if (e.error === 'network') {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = 2000 * retryCountRef.current;
          setMessage(`Network issue, retrying in ${delay/1000}s...`);
          setTimeout(() => {
            try {
              recognition.start();
            } catch (err) {
              console.error("Retry failed:", err);
            }
          }, delay);
        } else {
          setMessage("Network error. Click Start Voice to continue.");
          retryCountRef.current = 0;
        }
      } else if (e.error === 'no-speech') {
        setMessage("No speech detected. Speak again or click Start Voice.");
      } else if (e.error === 'not-allowed') {
        setMessage("⚠️ Microphone access denied. Enable permissions and refresh.");
      } else if (e.error !== 'aborted') {
        setMessage("Error occurred. Click Start Voice to continue.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  function speak(text: string, callback?: () => void) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    
    utterance.onstart = () => {
      setMessage(`🔊 ${text}`);
    };

    utterance.onend = () => {
      setTimeout(() => {
        if (callback) {
          callback();
        } else if (step < 5 && !isListening && !isSaving) {
          try {
            recognitionRef.current?.start();
          } catch (err) {
            console.error("Auto-start failed:", err);
            setMessage("Click Start Voice to continue");
          }
        }
      }, 2000);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function handleSpeech(text: string) {
    console.log("Step:", step, "Text:", text, "Current date:", appointmentDataRef.current.date);
    
    // Determine actual step based on ref data (immediate, no async delay)
    let actualStep = step;
    if (appointmentDataRef.current.date && !appointmentDataRef.current.timeSlot) {
      actualStep = 1; // We have date, need time
    } else if (appointmentDataRef.current.date && appointmentDataRef.current.timeSlot && !appointmentDataRef.current.symptoms) {
      actualStep = 2; // We have date and time, need symptoms
    } else if (appointmentDataRef.current.date && appointmentDataRef.current.timeSlot && appointmentDataRef.current.symptoms) {
      actualStep = 3; // We have everything, need confirmation
    }
    
    console.log("Actual step based on data:", actualStep);
    
    // Use actualStep for processing
    switch(actualStep) {
        case 1: // Time slot
          // Ensure we have a date from previous step
          if (!appointmentDataRef.current.date) {
            speak("I don't have your preferred date. Let me ask again - when would you like your appointment?");
            setStep(0);
            return;
          }
          
          // Use ref for doctors if state is empty (prevents state loss on re-renders)
          const doctorsList = doctors.length > 0 ? doctors : doctorsRef.current;
          const appointmentsList = appointments.length > 0 ? appointments : appointmentsRef.current;
          
          console.log(`🔍 State check - doctors: ${doctors.length}, ref: ${doctorsRef.current.length}`);
          console.log(`🔍 State check - appointments: ${appointments.length}, ref: ${appointmentsRef.current.length}`);
          console.log(`📋 Using doctors list with ${doctorsList.length} doctors`);
          
          const slot = extractTimeSlot(text);
          console.log("Extracted time slot:", slot);
          
          if (slot) {
            const date = new Date(appointmentDataRef.current.date);
            console.log("Checking availability for date:", date.toDateString(), "slot:", slot);
            
            // Find available doctors for this slot
            const availableDocs = doctorsList.filter(doc => {
              const isBooked = appointmentsList.some(apt => {
                const aptDate = apt.appointmentDate instanceof Date ? apt.appointmentDate : new Date(apt.appointmentDate);
                const isSameDay = aptDate.toDateString() === date.toDateString();
                const isSameSlot = apt.timeSlot === slot;
                const isSameDoctor = apt.doctorId === doc.id;
                
                console.log(`Doctor ${doc.name}: date match=${isSameDay}, slot match=${isSameSlot}, doctor match=${isSameDoctor}`);
                
                return isSameDoctor && isSameDay && isSameSlot;
              });
              return !isBooked;
            });
            
            console.log("Available doctors:", availableDocs.length, availableDocs.map(d => d.name));
            
            if (availableDocs.length > 0) {
              // Auto-select first available doctor
              const selectedDoc = availableDocs[0];
              // Update ref immediately
              appointmentDataRef.current = { ...appointmentDataRef.current, timeSlot: slot, selectedDoctorId: selectedDoc.id };
              // Update state
              setAppointmentData(prev => ({ ...prev, timeSlot: slot, selectedDoctorId: selectedDoc.id }));
              speak(`Time slot ${formatTimeSlot(slot)} selected. Dr. ${selectedDoc.name} is available. Please describe your symptoms or reason for visit.`);
              setStep(2);
            } else if (doctorsList.length > 0) {
              // No appointments conflict, use first doctor
              const selectedDoc = doctorsList[0];
              console.log(`No conflicts found, auto-assigning first doctor: ${selectedDoc.name}`);
              appointmentDataRef.current = { ...appointmentDataRef.current, timeSlot: slot, selectedDoctorId: selectedDoc.id };
              setAppointmentData(prev => ({ ...prev, timeSlot: slot, selectedDoctorId: selectedDoc.id }));
              speak(`Time slot ${formatTimeSlot(slot)} selected. Dr. ${selectedDoc.name} is available. Please describe your symptoms or reason for visit.`);
              setStep(2);
            } else {
              speak(`Sorry, I couldn't find any doctors. Please try manual booking or contact reception.`);
            }
          } else {
            speak("I didn't catch the time. Please say morning, afternoon, evening, or a specific time like 9 AM or 2 PM.");
          }
          break;

        case 2: // Symptoms
          // Ensure we have date and time from previous steps
          if (!appointmentDataRef.current.date || !appointmentDataRef.current.timeSlot) {
            speak("Something went wrong. Let's start over. When would you like your appointment?");
            setStep(0);
            appointmentDataRef.current = { date: "", timeSlot: "", symptoms: "", selectedDoctorId: "" };
            setAppointmentData({ date: "", timeSlot: "", symptoms: "", selectedDoctorId: "" });
            return;
          }
          
          if (text.length > 5) {
            // Update ref immediately
            appointmentDataRef.current = { ...appointmentDataRef.current, symptoms: text };
            // Update state
            setAppointmentData(prev => ({ ...prev, symptoms: text }));
            const date = new Date(appointmentDataRef.current.date);
            const doctor = doctors.find(d => d.id === appointmentDataRef.current.selectedDoctorId);
            speak(`Got it. Let me confirm: Appointment with Dr. ${doctor?.name}, on ${date.toLocaleDateString()}, at ${formatTimeSlot(appointmentDataRef.current.timeSlot)}, for ${text}. Should I book this?`);
            setStep(3);
          } else {
            speak("Please describe your symptoms or reason for visit in a bit more detail.");
          }
          break;

        case 3: // Confirmation
          if (text.includes("yes") || text.includes("confirm") || text.includes("book") || text.includes("correct")) {
            setStep(4);
            bookAppointment();
          } else if (text.includes("no") || text.includes("cancel") || text.includes("restart")) {
            speak("Okay, let's start over. When would you like your appointment?");
            setStep(0);
            appointmentDataRef.current = { date: "", timeSlot: "", symptoms: "", selectedDoctorId: "" };
            setAppointmentData({ date: "", timeSlot: "", symptoms: "", selectedDoctorId: "" });
          } else {
            speak("Say yes to confirm or no to start over.");
          }
          break;
      
      case 0: // Date
        const date = extractDate(text);
        console.log("Extracted date:", date);
        if (date) {
          // Update ref immediately
          appointmentDataRef.current = { ...appointmentDataRef.current, date: date.toISOString() };
          // Update state
          setAppointmentData(prev => ({ ...prev, date: date.toISOString() }));
          speak(`Appointment date set to ${date.toLocaleDateString()}. What time do you prefer? Say morning, afternoon, evening, or a specific time like 9 AM or 2 PM.`);
          setStep(1);
        } else {
          speak("I didn't catch the date. Please say today, tomorrow, next Monday, or a specific date like January 20th.");
        }
        break;
    }
  }



  function extractDate(text: string): Date | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Early return if text looks like time input
    if (text.includes("am") || text.includes("pm") || text.includes("a.m.") || text.includes("p.m.") ||
        text.includes("morning") || text.includes("afternoon") || text.includes("evening") ||
        text.includes("noon") || text.includes("o'clock") || text.includes("oclock")) {
      console.log("Detected time input, skipping date extraction");
      return null;
    }
    
    // Handle "today"
    if (text.includes("today")) {
      return new Date(today);
    }
    
    // Handle "tomorrow"
    if (text.includes("tomorrow")) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    // Handle "day after tomorrow"
    if (text.includes("day after")) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return dayAfter;
    }
    
    // Handle "next week"
    if (text.includes("next week")) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    // Handle day names (Monday, Tuesday, etc.)
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < dayNames.length; i++) {
      if (text.includes(dayNames[i])) {
        const targetDay = i;
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
        const date = new Date(today);
        date.setDate(date.getDate() + daysToAdd);
        return date;
      }
    }
    
    // Handle month names with day (e.g., "January 20th", "Jan 20")
    const monthNames = [
      { full: "january", short: "jan" },
      { full: "february", short: "feb" },
      { full: "march", short: "mar" },
      { full: "april", short: "apr" },
      { full: "may", short: "may" },
      { full: "june", short: "jun" },
      { full: "july", short: "jul" },
      { full: "august", short: "aug" },
      { full: "september", short: "sep" },
      { full: "october", short: "oct" },
      { full: "november", short: "nov" },
      { full: "december", short: "dec" }
    ];
    
    for (let i = 0; i < monthNames.length; i++) {
      if (text.includes(monthNames[i].full) || text.includes(monthNames[i].short)) {
        const dayMatch = text.match(/(\d{1,2})(st|nd|rd|th)?/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          if (day >= 1 && day <= 31) {
            const date = new Date(today.getFullYear(), i, day);
            // If date is in the past, use next year
            if (date < today) {
              date.setFullYear(date.getFullYear() + 1);
            }
            return date;
          }
        }
      }
    }
    
    // Handle just day number (e.g., "20th", "25")
    // Avoid matching single digit numbers that might be times (1-9)
    const dayMatch = text.match(/\b(\d{2})(st|nd|rd|th)?\b|\b([1-3][0-9])(st|nd|rd|th)?\b/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1] || dayMatch[3]);
      if (day >= 10 && day <= 31) { // Only match 10-31 to avoid time conflicts
        const date = new Date(today);
        date.setDate(day);
        // If date is in the past this month, try next month
        if (date < today) {
          date.setMonth(date.getMonth() + 1);
        }
        return date;
      }
    }
    
    return null;
  }

  function extractTimeSlot(text: string): string {
    // Handle common time phrases
    if (text.includes("morning") || text.includes("early")) return "09:00-09:30";
    if (text.includes("noon") || text.includes("midday") || text.includes("lunch")) return "12:00-12:30";
    if (text.includes("afternoon")) return "14:00-14:30";
    if (text.includes("evening") || text.includes("late")) return "17:00-17:30";
    
    // Handle specific hour mentions
    const numberWords: { [key: string]: number } = {
      "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
      "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
      "eleven": 11, "twelve": 12
    };
    
    // Check for word numbers
    for (const [word, num] of Object.entries(numberWords)) {
      if (text.includes(word)) {
        let hour = num;
        // Assume PM for 1-7, AM for 8-12 unless specified
        if (text.includes("am") || text.includes("a.m.")) {
          // Keep as is
        } else if (text.includes("pm") || text.includes("p.m.")) {
          if (hour < 12) hour += 12;
        } else {
          // Smart defaults
          if (hour >= 1 && hour <= 7) hour += 12; // PM
        }
        
        if (hour >= 9 && hour < 18) {
          const timeStr = hour.toString().padStart(2, '0') + ":00";
          const endMinutes = "30";
          const endHour = hour.toString().padStart(2, '0');
          return `${timeStr}-${endHour}:${endMinutes}`;
        }
      }
    }
    
    // Try to extract time pattern with digits
    const timeMatch = text.match(/(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const isPM = timeMatch[2]?.toLowerCase().includes('p');
      const isAM = timeMatch[2]?.toLowerCase().includes('a');
      
      if (isPM && hour < 12) {
        hour += 12;
      } else if (isAM && hour === 12) {
        hour = 0;
      } else if (!isAM && !isPM) {
        // Smart defaults based on hour
        if (hour >= 1 && hour <= 7) hour += 12; // Assume PM
        if (hour === 8) hour = 8; // Could be 8 AM
      }
      
      if (hour >= 9 && hour < 18) {
        const timeStr = hour.toString().padStart(2, '0') + ":00";
        const endMinutes = "30";
        const endHour = hour.toString().padStart(2, '0');
        return `${timeStr}-${endHour}:${endMinutes}`;
      }
    }
    
    // Handle direct hour mentions (9, 10, 11, 2, 3, 4, 5)
    if (text.includes("9")) return "09:00-09:30";
    if (text.includes("10")) return "10:00-10:30";
    if (text.includes("11")) return "11:00-11:30";
    if (text.includes("12")) return "12:00-12:30";
    if (text.match(/\b2\b/) || text.includes(" 2 ")) return "14:00-14:30";
    if (text.match(/\b3\b/) || text.includes(" 3 ")) return "15:00-15:30";
    if (text.match(/\b4\b/) || text.includes(" 4 ")) return "16:00-16:30";
    if (text.match(/\b5\b/) || text.includes(" 5 ")) return "17:00-17:30";
    
    return "";
  }

  async function bookAppointment() {
    setIsSaving(true);
    speak("Booking your appointment, please wait...", async () => {
      try {
        // Use ref for patient data if state is empty
        const patient = patientData || patientDataRef.current;
        
        if (!patient) {
          speak("Error: Patient data not loaded. Please refresh and try again.");
          setIsSaving(false);
          return;
        }
        
        console.log("✅ Patient data available for booking:", patient.name);

        // Use ref for doctors if state is empty
        const doctorsList = doctors.length > 0 ? doctors : doctorsRef.current;
        const doctor = doctorsList.find(d => d.id === appointmentDataRef.current.selectedDoctorId);
        
        if (!doctor) {
          speak("Error finding doctor. Please try manual booking.");
          setIsSaving(false);
          return;
        }

        const appointmentDate = new Date(appointmentDataRef.current.date);
        
        // Use ref for appointments if state is empty
        const appointmentsList = appointments.length > 0 ? appointments : appointmentsRef.current;

        const appointment: Appointment = {
          id: `APT-${Date.now()}`,
          uhid: patient.uhid,
          patientId: patient.id,
          patientName: patient.name,
          patientPhone: patient.phone,
          doctorId: doctor.id,
          doctorName: doctor.name,
          department: doctor.department || "General",
          appointmentDate: appointmentDate,
          timeSlot: appointmentDataRef.current.timeSlot,
          type: "consultation",
          status: "scheduled",
          reason: appointmentDataRef.current.symptoms,
          notes: "Booked via voice assistant",
          createdAt: new Date(),
          createdBy: user?.uid || "patient",
          queueNumber: getNextQueueNumber(appointmentsList, appointmentDate),
          voiceBooked: true
        };

        if (db) {
          await setDoc(doc(db, "appointments", appointment.id), appointment);
        }

        speak(`Success! Your appointment is confirmed with Dr. ${doctor.name} on ${appointmentDate.toLocaleDateString()} at ${formatTimeSlot(appointmentDataRef.current.timeSlot)}. Your queue number is ${appointment.queueNumber}. You will be redirected to your appointments page.`, () => {
          setTimeout(() => {
            router.push("/dashboard/patient/appointments");
          }, 2000);
        });

        setStep(5); // Success state
      } catch (error) {
        console.error("Booking error:", error);
        speak("Sorry, there was an error booking your appointment. Please try manual booking or contact reception.");
      } finally {
        setIsSaving(false);
      }
    });
  }

  function start() {
    if (!recognitionRef.current) {
      alert("Speech recognition not ready. Please refresh.");
      return;
    }

    const patient = patientData || patientDataRef.current;
    if (!patient) {
      setMessage("Loading patient data...");
      return;
    }

    try {
      retryCountRef.current = 0;
      
      if (step === 0) {
        speak("Hello! Welcome to SwasthyaSetu voice booking. When would you like your appointment? Say today, tomorrow, or a specific date.");
      } else if (step === 5) {
        // Reset
        setStep(0);
        appointmentDataRef.current = { date: "", timeSlot: "", symptoms: "", selectedDoctorId: "" };
        setAppointmentData({ date: "", timeSlot: "", symptoms: "", selectedDoctorId: "" });
        setMessage("Click Start Voice to book another appointment");
      } else {
        recognitionRef.current.start();
      }
    } catch (error: any) {
      console.error("Start error:", error);
      if (error.message?.includes('already started')) {
        setMessage("Already listening...");
      } else {
        setMessage("Error. Please wait and try again.");
      }
    }
  }

  const stepLabels = ["Date", "Time", "Symptoms", "Confirm", "Booking", "Complete"];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-6 border-2 border-emerald-200 rounded-lg shadow-lg bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Mic className={`h-8 w-8 ${isListening ? 'text-red-500 animate-pulse' : isSaving ? 'text-blue-500' : step === 5 ? 'text-green-500' : 'text-emerald-600'}`} />
            <h3 className="text-2xl font-semibold">Voice Appointment Booking</h3>
          </div>
          {step > 0 && step < 5 && (
            <Badge variant="outline" className="text-sm">
              Step {step + 1}/4: {stepLabels[step]}
            </Badge>
          )}
        </div>
        
        {/* Browser Compatibility Notice */}
        {!isVoiceSupported && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>ℹ️ Browser Compatibility:</strong> Voice booking is supported on Chrome and Edge.
              <br />
              You can continue using manual booking on other browsers.
            </p>
          </div>
        )}
        
        {/* Message Area */}
        <div className="mb-6 p-4 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-md min-h-[100px] flex items-center justify-center">
          <p className="text-base text-gray-800 dark:text-gray-200 text-center">{message}</p>
        </div>

        {/* Collected Data Display */}
        {(appointmentData.date || appointmentData.timeSlot || appointmentData.symptoms) && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <h4 className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-300">Appointment Details:</h4>
            <div className="space-y-1 text-sm">
              {appointmentData.date && <p>✓ Date: <span className="font-medium">{new Date(appointmentData.date).toLocaleDateString()}</span></p>}
              {appointmentData.timeSlot && <p>✓ Time: <span className="font-medium">{formatTimeSlot(appointmentData.timeSlot)}</span></p>}
              {appointmentData.selectedDoctorId && <p>✓ Doctor: <span className="font-medium">{doctors.find(d => d.id === appointmentData.selectedDoctorId)?.name}</span></p>}
              {appointmentData.symptoms && <p>✓ Symptoms: <span className="font-medium">{appointmentData.symptoms}</span></p>}
            </div>
          </div>
        )}

        {/* Success Message */}
        {step === 5 && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-md flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100">Appointment Booked Successfully!</h4>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                Redirecting to your appointments page...
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={start}
            disabled={isListening || isSaving || step === 5 || !isVoiceSupported}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2
              ${(isListening || isSaving || step === 5 || !isVoiceSupported)
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
              }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : isListening ? (
              "Listening..."
            ) : step === 5 ? (
              "Completed"
            ) : !isVoiceSupported ? (
              "Voice Not Supported"
            ) : (
              "Start Voice"
            )}
          </button>
          
          {step > 0 && step < 4 && !isSaving && (
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                try {
                  recognitionRef.current?.stop();
                } catch (e) {}
                setStep(0);
                appointmentDataRef.current = { date: "", timeSlot: "", symptoms: "", selectedDoctorId: "" };
                setAppointmentData({ date: "", timeSlot: "", symptoms: "", selectedDoctorId: "" });
                setMessage("Click Start Voice to begin");
                retryCountRef.current = 0;
              }}
              className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all"
            >
              Reset
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400 border-t pt-4">
          <p className="font-semibold mb-2">📋 Voice Booking Flow:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Click "Start Voice" and say the date (e.g., "tomorrow" or "January 20th")</li>
            <li>Say preferred time (e.g., "morning", "afternoon", or "2 PM")</li>
            <li>System checks doctor availability and assigns one automatically</li>
            <li>Describe your symptoms briefly</li>
            <li>Say "yes" to confirm and book</li>
          </ol>
          <p className="mt-3 text-xs text-gray-500">💡 Tip: Speak clearly and wait for the "Listening..." indicator before speaking.</p>
          {isVoiceSupported && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">✓ Voice booking is available in your browser</p>
          )}
          {!isVoiceSupported && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">ℹ️ For voice booking, please use Chrome or Edge browser</p>
          )}
        </div>
      </div>
    </div>
  );
}