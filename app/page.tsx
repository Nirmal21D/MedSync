"use client"

import { Heart, Shield, Activity, Users, Stethoscope, Pill, CalendarCheck, Bed, FileText, BarChart3, Settings, ClipboardList, Package, Download, Upload, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { useState } from "react"

const ROLES = [
  {
    icon: <User className="h-8 w-8 text-blue-600 mb-2" />,
    title: "Admin",
    desc: "Full control over hospital operations, staff, and system settings."
  },
  {
    icon: <Stethoscope className="h-8 w-8 text-green-600 mb-2" />,
    title: "Doctor",
    desc: "Manage patients, appointments, prescriptions, and medical records."
  },
  {
    icon: <Users className="h-8 w-8 text-indigo-600 mb-2" />,
    title: "Nurse",
    desc: "Track patient vitals, assist in care, and manage bed assignments."
  },
  {
    icon: <Pill className="h-8 w-8 text-pink-600 mb-2" />,
    title: "Pharmacist",
    desc: "Oversee pharmacy inventory and process prescriptions."
  },
  {
    icon: <CalendarCheck className="h-8 w-8 text-yellow-600 mb-2" />,
    title: "Receptionist",
    desc: "Schedule appointments and manage patient intake."
  },
]

const MODULES = [
  {
    icon: <Stethoscope className="h-7 w-7 text-blue-500 mb-2" />,
    title: "Patient Management",
    desc: "Register, track, and manage patient records securely."
  },
  {
    icon: <CalendarCheck className="h-7 w-7 text-green-500 mb-2" />,
    title: "Appointments",
    desc: "Schedule and coordinate appointments with ease."
  },
  {
    icon: <Pill className="h-7 w-7 text-indigo-500 mb-2" />,
    title: "Pharmacy",
    desc: "Manage prescriptions and inventory efficiently."
  },
  {
    icon: <Bed className="h-7 w-7 text-purple-500 mb-2" />,
    title: "Bed Management",
    desc: "Monitor and manage hospital bed allocation."
  },
  {
    icon: <Package className="h-7 w-7 text-orange-500 mb-2" />,
    title: "Inventory",
    desc: "Track and manage hospital inventory and supplies."
  },
  {
    icon: <ClipboardList className="h-7 w-7 text-pink-500 mb-2" />,
    title: "Notes & Collaboration",
    desc: "Empower your team with seamless communication tools."
  },
  {
    icon: <FileText className="h-7 w-7 text-gray-700 mb-2" />,
    title: "Prescriptions",
    desc: "Create, approve, and manage patient prescriptions."
  },
  {
    icon: <BarChart3 className="h-7 w-7 text-cyan-600 mb-2" />,
    title: "Analytics",
    desc: "Gain real-time insights into hospital operations."
  },
  {
    icon: <Settings className="h-7 w-7 text-gray-500 mb-2" />,
    title: "Settings",
    desc: "Configure system, security, and notification preferences."
  },
]

const TRUSTED_LOGOS = [
  "/placeholder-logo.png",
  "/placeholder-logo.svg",
  "/placeholder.jpg",
  "/placeholder-user.jpg",
  "/placeholder.svg"
]

const TESTIMONIALS = [
  {
    quote: "MedSync has transformed our hospital's workflow. The real-time dashboards and secure access are game changers!",
    name: "Dr. Sarah Johnson",
    title: "Chief Medical Officer, CityCare Hospital"
  },
  {
    quote: "We reduced paperwork and improved patient care thanks to MedSync's all-in-one platform.",
    name: "Michael Chen",
    title: "Hospital Administrator, Green Valley Clinic"
  },
  {
    quote: "The role-based dashboards make it easy for our staff to focus on what matters most.",
    name: "Jennifer Brown",
    title: "Head Nurse, MedSync General Hospital"
  }
]

export default function LandingPage() {
  const [contact, setContact] = useState({ name: "", email: "", message: "" })
  const [contactStatus, setContactStatus] = useState<string | null>(null)
  const [contactLoading, setContactLoading] = useState(false)

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContact({ ...contact, [e.target.name]: e.target.value })
  }
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setContactLoading(true)
    setTimeout(() => {
      setContactStatus("Thank you! We'll get back to you soon.")
      setContactLoading(false)
      setContact({ name: "", email: "", message: "" })
    }, 1200)
  }

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i = 1) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.15, duration: 0.7, type: 'spring' as const }
    })
  }
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({ opacity: 1, transition: { delay: i * 0.1, duration: 0.7 } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-indigo-200 flex flex-col">
      {/* Top Navigation */}
      <motion.nav initial="hidden" animate="visible" variants={fadeIn} className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Heart className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">MedSync</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-gray-700 font-medium">
          <a href="#features" className="hover:text-blue-600 transition">Features</a>
          <a href="#security" className="hover:text-blue-600 transition">Security</a>
          <Link href="/login" className="ml-4">
            <Button size="sm" className="px-5">Login</Button>
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <header className="w-full py-20 px-4 flex flex-col items-center justify-center bg-gradient-to-r from-blue-200 via-indigo-100 to-indigo-200 relative overflow-hidden">
        <span className="uppercase tracking-widest text-blue-600 font-semibold mb-2 text-sm">Modern Healthcare ERP</span>
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} custom={0} className="flex items-center mb-4 z-10">
          <Heart className="h-16 w-16 text-blue-600 mr-3 animate-pulse" />
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight drop-shadow-lg">MedSync</h1>
        </motion.div>
        <motion.p initial="hidden" animate="visible" variants={fadeInUp} custom={1} className="text-lg md:text-xl text-gray-700 max-w-2xl text-center mb-4 font-medium z-10">
          The all-in-one platform to streamline patient care, staff management, and hospital operations.
        </motion.p>
        <motion.p initial="hidden" animate="visible" variants={fadeInUp} custom={2} className="text-base md:text-lg text-gray-600 max-w-xl text-center mb-8 z-10">
          Secure, real-time, and role-based. Built for modern clinics and hospitals.
        </motion.p>
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} custom={3} className="flex gap-4 mb-12 z-10">
          <Link href="/login">
            <Button size="lg" className="px-10 py-6 text-lg font-semibold shadow-lg bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white transition-all duration-300">Get Started</Button>
          </Link>
          <a href="mailto:info@medsync-hospital.com">
            <Button variant="outline" size="lg" className="px-10 py-6 text-lg font-semibold border-blue-400 text-blue-700 hover:bg-blue-50 transition-all duration-300">Request Demo</Button>
          </a>
        </motion.div>
        {/* Dashboard Mockup */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} custom={4} className="w-full flex justify-center z-10">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white max-w-3xl">
            <Image src="/placeholder.jpg" alt="MedSync Dashboard Screenshot" width={900} height={500} className="object-cover w-full h-auto" />
          </div>
        </motion.div>
        {/* Decorative gradient blob */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200 rounded-full opacity-30 blur-3xl z-0" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-200 rounded-full opacity-30 blur-3xl z-0" />
      </header>

      {/* Why Choose MedSync */}
      <motion.section id="features" className="w-full max-w-6xl mx-auto py-20 px-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Why Choose MedSync?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[0,1,2].map(i => (
            <motion.div key={i} variants={fadeInUp} custom={i} className="flex flex-col items-center bg-white rounded-2xl shadow-xl p-12 border border-blue-50 hover:shadow-2xl transition">
              {i === 0 && <Shield className="h-14 w-14 text-blue-600 mb-5" />}
              {i === 1 && <Activity className="h-14 w-14 text-green-600 mb-5" />}
              {i === 2 && <Users className="h-14 w-14 text-indigo-600 mb-5" />}
              <h3 className="text-2xl font-semibold mb-3">{["Secure & Compliant","Real-time Insights","Role-based Dashboards"][i]}</h3>
              <p className="text-gray-600 text-center text-lg">
                {[
                  "Your data is protected with industry-leading security, privacy standards, and two-factor authentication.",
                  "Access up-to-date patient and operational data for informed decision-making and analytics.",
                  "Tailored experiences for doctors, nurses, pharmacists, admins, and receptionists."
                ][i]}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

    

      {/* Security & Data Management */}
      <motion.section id="security" className="w-full max-w-6xl mx-auto py-20 px-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">Security & Data Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[0,1,2].map(i => (
            <motion.div key={i} variants={fadeInUp} custom={i} className="flex flex-col items-center bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-2xl transition">
              {i === 0 && <Settings className="h-10 w-10 text-blue-600 mb-4" />}
              {i === 1 && <Download className="h-10 w-10 text-green-600 mb-4" />}
              {i === 2 && <Upload className="h-10 w-10 text-indigo-600 mb-4" />}
              <h4 className="text-lg font-semibold mb-2">{["Advanced Security","Data Export & Backup","Easy Migration"][i]}</h4>
              <p className="text-gray-600 text-center text-base">{[
                "Two-factor authentication, session timeout, and password policies keep your data safe.",
                "Export, import, and backup hospital data for compliance and peace of mind.",
                "Seamlessly migrate from previous systems or restore from backups."
              ][i]}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-gray-500 text-sm mt-auto border-t border-gray-200 bg-white">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-2">
          <a href="#features" className="hover:text-blue-600 transition">Features</a>
          <a href="#security" className="hover:text-blue-600 transition">Security</a>
          <a href="#" className="hover:text-blue-600 transition">Privacy Policy</a>
          <a href="#" className="hover:text-blue-600 transition">Terms</a>
        </div>
        <div>&copy; {new Date().getFullYear()} MedSync. All rights reserved.</div>
      </footer>
    </div>
  )
}
