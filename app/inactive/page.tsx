"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function InactivePage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full flex flex-col items-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Account Inactive</h1>
        <p className="text-gray-600 mb-6 text-center">
          Your account is currently <span className="font-semibold text-yellow-700">inactive</span>.<br />
          Please contact the administrator for access.<br />
        </p>
        <Button onClick={() => router.push("/")} className="w-full">Go to Home Page</Button>
      </div>
    </div>
  )
}