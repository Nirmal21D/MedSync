"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, setDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function MockImportPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center text-lg text-gray-500">Mock data import is no longer available. All data is now managed in Firestore.</div>
    </div>
  )
}
