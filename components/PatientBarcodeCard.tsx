"use client"

import { useRef } from "react"
import Barcode from "react-barcode"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Printer } from "lucide-react"
import type { Patient } from "@/lib/types"

interface PatientBarcodeCardProps {
  patient: Patient
}

export default function PatientBarcodeCard({ patient }: PatientBarcodeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printContent = cardRef.current
    if (!printContent) return

    const printWindow = window.open('', '', 'height=600,width=800')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Patient Card - ${patient.uhid}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .card {
              border: 2px solid #000;
              border-radius: 10px;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .hospital-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .info {
              margin: 10px 0;
            }
            .label {
              font-weight: bold;
              display: inline-block;
              width: 100px;
            }
            .barcode-container {
              text-align: center;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleDownload = async () => {
    const { default: html2canvas } = await import('html2canvas')
    const element = cardRef.current
    if (!element) return

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2
    })

    const link = document.createElement('a')
    link.download = `patient-card-${patient.uhid}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Card
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download Card
        </Button>
      </div>

      <Card ref={cardRef} className="max-w-md mx-auto print:shadow-none">
        <CardHeader className="text-center border-b">
          <div className="text-xl font-bold">MedSync Hospital</div>
          <CardTitle className="text-sm">Patient Identification Card</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">Name:</span>
              <span>{patient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">UHID:</span>
              <span className="font-mono">{patient.uhid}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Age/Gender:</span>
              <span>{patient.age} / {patient.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Phone:</span>
              <span>{patient.phone}</span>
            </div>
          </div>

          <div className="barcode-container bg-white p-4 rounded border">
            <Barcode 
              value={patient.uhid} 
              width={1.5}
              height={60}
              fontSize={14}
              margin={5}
            />
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Scan this barcode for quick patient lookup</p>
            <p className="mt-1">Issued: {new Date().toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
