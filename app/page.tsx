"use client"

import { Heart, Shield, Activity, Users, Stethoscope, Pill, CalendarCheck, Bed, FileText, BarChart3, Settings, ClipboardList, Package, Download, Upload, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Spline from "@splinetool/react-spline"

const ROLES = [
  {
    avatar: "/admin.png",
    title: "Admin",
    desc: "Full control over hospital operations, staff, and system settings."
  },
  {
    avatar: "/doctor.png",
    title: "Doctor",
    desc: "Manage patients, appointments, prescriptions, and medical records."
  },
  {
    avatar: "/nurse.png",
    title: "Nurse",
    desc: "Track patient vitals, assist in care, and manage bed assignments."
  },
  {
    avatar: "/phramacist.png",
    title: "Pharmacist",
    desc: "Oversee pharmacy inventory and process prescriptions."
  },
  {
    avatar: "/receptionist.png",
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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 flex flex-col transition-colors duration-500 relative">
      {/* Animated Green Blob (Left, Background for Hero) */}
      <motion.div
        initial={{ opacity: 0.7, y: 0 }}
        animate={{ opacity: 0.7, y: [0, -30, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-80 h-80 pointer-events-none z-0"
        style={{ willChange: 'transform' }}
      >
        <div className="w-full h-full bg-emerald-300 rounded-full opacity-60 blur-3xl" />
      </motion.div>
      {/* Top Navigation */}
      <motion.nav
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="sticky top-0 z-50 glass-card bg-white/70 dark:bg-gray-900/80 backdrop-blur-lg border-b border-white/30 dark:border-gray-800 py-3 flex items-center justify-between shadow-md transition-colors duration-500"
      >
        <div className="flex items-center gap-2 pl-8 md:pl-16">
          <Heart className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">MedSync</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-gray-800 dark:text-gray-200 font-semibold pr-8 md:pr-16">
          <a href="#features" className="hover:text-emerald-600 hover:bg-emerald-100/60 rounded-lg transition px-3 py-1">Features</a>
          <a href="#security" className="hover:text-emerald-600 hover:bg-emerald-100/60 rounded-lg transition px-3 py-1">Security</a>
          <Link href="/login" className="ml-4">
            <Button size="sm" className="px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 hover:from-emerald-600 hover:to-emerald-700">Login</Button>
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <header className="w-full py-28 px-6 flex flex-col md:flex-row items-center justify-between bg-gradient-to-br from-emerald-50 via-gray-50 to-violet-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 relative overflow-hidden transition-colors duration-500">
        {/* Left: Headline and CTA */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 flex flex-col items-start max-w-xl z-10 md:mr-12 pl-8 md:pl-16"
        >
          <span className="uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold mb-4 text-sm">Modern Healthcare ERP</span>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, type: "spring" }}
            className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6"
          >
            MedSync: <span className="text-violet-600">Next-Gen</span> Hospital Management
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, type: "spring" }}
            className="text-xl text-gray-700 dark:text-gray-300 mb-10 font-medium"
          >
            The all-in-one platform to streamline patient care, staff management, and hospital operations. Secure, real-time, and role-based.
          </motion.p>
          <div className="flex gap-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
            >
              <Link href="/login">
                <Button size="lg" className="px-10 py-6 text-lg font-semibold shadow-lg bg-gradient-to-r from-emerald-500 to-violet-500 hover:from-emerald-600 hover:to-violet-600 text-white transition-all duration-300 border-0">Get Started</Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.6, type: "spring" }}
            >
              <a href="mailto:info@medsync-hospital.com">
                <Button variant="outline" size="lg" className="px-10 py-6 text-lg font-semibold border-emerald-400 text-emerald-700 hover:bg-emerald-50 transition-all duration-300">Request Demo</Button>
              </a>
            </motion.div>
          </div>
        </motion.div>
        {/* Right: Spline 3D Model */}
        <motion.div
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: -360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-56 -right-56 w-[40rem] h-[40rem] pointer-events-none"
          style={{ originX: 0.5, originY: 0.5, willChange: 'transform' }}
        >
          <div
            className="absolute bottom-0 left-1/2 w-72 h-72 bg-violet-400 rounded-full opacity-60 blur-3xl z-0"
            style={{ transform: "translate(-50%, 50%)", willChange: 'transform' }}
          />
        </motion.div>
        <div className="flex-1 flex justify-center items-center mt-16 md:mt-0 z-10 min-h-[340px]">
          <div className="w-full max-w-xl h-[500px] flex items-center justify-center overflow-hidden">
            <div style={{ transform: 'scale(1.05) translate(2%, 6%)' }}>
              <Spline scene="https://prod.spline.design/ukwZekStKbe6dktY/scene.splinecode" />
            </div>
          </div>
        </div>
      </header>

      {/* Vibrant animated background for main content */}
      <div className="relative w-full flex-1 z-0">
        <div className="absolute inset-0 -z-20 animate-bgMove bg-[length:300%_300%] bg-gradient-to-br from-[#f0fdfa] via-[#f5d0fe] to-[#ede9fe] dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors duration-500" />
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute left-[60%] top-[20%] w-[40vw] h-[40vw] bg-emerald-200 dark:bg-emerald-900 opacity-30 rounded-full blur-3xl" />
          <div className="absolute left-[20%] bottom-[10%] w-[30vw] h-[30vw] bg-violet-200 dark:bg-violet-900 opacity-30 rounded-full blur-3xl" />
        </div>

        {/* Feature Highlights */}
        <section className="w-full max-w-6xl mx-auto py-16 px-4">
          <h2 className="text-3xl font-bold text-center mb-10 dark:text-white">Why MedSync Stands Out</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[0,1,2].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.7, type: 'spring' }}
              >
                <Card className="glass-card dark:bg-gray-900/80 dark:border-gray-800 dark:text-gray-100 transition-colors duration-500">
                  <CardHeader className="flex flex-col items-center">
                    {[<Shield className="h-12 w-12 text-blue-600 mb-2" />, <Activity className="h-12 w-12 text-green-600 mb-2" />, <Users className="h-12 w-12 text-indigo-600 mb-2" />][i]}
                    <CardTitle>{["Secure & Compliant","Real-time Insights","Role-based Dashboards"][i]}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-gray-600 dark:text-gray-300">{
                    [
                      "Your data is protected with industry-leading security, privacy standards, and two-factor authentication.",
                      "Access up-to-date patient and operational data for informed decision-making and analytics.",
                      "Tailored experiences for doctors, nurses, pharmacists, admins, and receptionists."
                    ][i]
                  }</CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Role-Based Dashboards Preview (now a grid with human icons) */}
        <section className="w-full max-w-6xl mx-auto py-16 px-4">
          <h2 className="text-3xl font-bold text-center mb-10 dark:text-white">Hospital Roles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
            {ROLES.map((role, idx) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.7, type: 'spring' }}
              >
                <Card className="glass-card flex flex-col items-center py-10 px-4 h-[350px] w-full min-w-[50px] transition-all duration-300 dark:bg-gray-900/80 dark:border-gray-800 dark:text-gray-100">
                  <div className="mb-4 flex items-center justify-center w-32 h-32">
                    <img src={role.avatar} alt={role.title} className="w-28 h-28 object-contain" />
                  </div>
                  <CardTitle className="text-center text-lg font-bold mb-2 dark:text-white">{role.title}</CardTitle>
                  <CardContent className="text-center text-gray-600 dark:text-gray-300 text-sm">{role.desc}</CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Modules Overview */}
        <section className="w-full max-w-6xl mx-auto py-16 px-4">
          <h2 className="text-3xl font-bold text-center mb-10 dark:text-white">All-in-One Hospital Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {MODULES.map((mod, idx) => (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.7, type: 'spring' }}
              >
                <Card className="glass-card dark:bg-gray-900/80 dark:border-gray-800 dark:text-gray-100 transition-colors duration-500">
                  <CardHeader className="flex flex-col items-center">
                    {mod.icon}
                    <CardTitle>{mod.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-gray-600 dark:text-gray-300">{mod.desc}</CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full py-8 text-center text-gray-500 dark:text-gray-400 text-sm mt-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 bg-opacity-80 dark:bg-opacity-90 backdrop-blur transition-colors duration-500">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-2">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Features</a>
            <a href="#security" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Security</a>
            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Terms</a>
          </div>
          <div>&copy; {new Date().getFullYear()} MedSync. All rights reserved.</div>
        </footer>
      </div>
    </div>
  )
}
