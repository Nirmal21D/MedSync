"use client"

import { useState, useEffect, useRef } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DialogTitle } from "@/components/ui/dialog"
import { Scan, Search, X } from "lucide-react"
import { validateUHID, parseBarcodeData } from "@/lib/barcode-utils"

interface BarcodeScannerProps {
  onScan: (uhid: string) => void
  onClose?: () => void
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [scanInput, setScanInput] = useState("")
  const [error, setError] = useState("")
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (showCamera && videoRef.current) {
      setCameraError("")
      codeReaderRef.current = new BrowserMultiFormatReader()
      codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result) {
          setShowCamera(false)
          setScanInput(result.getText())
          handleScan(result.getText())
        }
        if (err && err.name !== 'NotFoundException') {
          setCameraError("Camera error: " + err.message)
        }
      })
      return () => {
        if (codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
          codeReaderRef.current.reset()
        }
        codeReaderRef.current = null
      }
    } else {
      if (codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
        codeReaderRef.current.reset()
      }
      codeReaderRef.current = null
    }
    // eslint-disable-next-line
  }, [showCamera])


  const handleScan = (input?: string) => {
    const value = typeof input === "string" ? input : scanInput
    const uhid = parseBarcodeData(value)
    if (!uhid) {
      setError("Please enter or scan a barcode")
      return
    }
    if (!validateUHID(uhid)) {
      setError("Invalid UHID format. Expected format: UHID-YYYYMMDD-XXXXX")
      return
    }
    setError("")
    onScan(uhid)
    setScanInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScan()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            <CardTitle>Scan Patient Barcode</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Scan patient barcode or enter UHID manually
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Scan barcode or type UHID..."
              value={scanInput}
              onChange={(e) => {
                setScanInput(e.target.value)
                setError("")
              }}
              onKeyPress={handleKeyPress}
              className="font-mono"
            />
            <Button onClick={handleScan}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant={showCamera ? "destructive" : "outline"} onClick={() => setShowCamera(v => !v)}>
              {showCamera ? "Close Camera" : "Scan with Camera"}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {showCamera && (
            <div className="flex flex-col items-center mt-2">
              <DialogTitle className="sr-only">Scan Patient Barcode (Camera)</DialogTitle>
              <video ref={videoRef} style={{ width: 320, height: 240, borderRadius: 8, background: '#000' }} autoPlay muted />
              {cameraError && <p className="text-sm text-destructive mt-2">{cameraError}</p>}
              <p className="text-xs text-muted-foreground mt-2">Align the barcode within the frame</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Instructions:</strong>
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
            <li>Use barcode scanner to scan patient card</li>
            <li>Or manually enter UHID from patient card</li>
            <li>Press Enter or click Search to find patient</li>
            <li>Or use your device camera to scan barcode</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
