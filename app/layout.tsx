import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import ThemeInitializer from "@/components/theme-initializer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MedSync - Healthcare ERP System",
  description: "Complete healthcare management system for hospitals",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className + " min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200"} style={{background: 'linear-gradient(120deg, #e0e7ff 0%, #f0fdfa 40%, #f5d0fe 100%, #fef9c3 120%)', backgroundSize: '300% 300%'}}>
        <ThemeInitializer />
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
