"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"
import type { Bill } from "@/lib/billing-utils"

interface BillPrintProps {
  bill: Bill
  patientName: string
  patientUhid: string
}

export default function BillPrint({ bill, patientName, patientUhid }: BillPrintProps) {
  const billRef = useRef<HTMLDivElement>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const handlePrint = () => {
    const printContent = billRef.current
    if (!printContent) return

    const printWindow = window.open('', '', 'height=600,width=800')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${bill.billNumber}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              body { margin: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .bill-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .hospital-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .bill-title {
              font-size: 18px;
              font-weight: bold;
              margin-top: 10px;
            }
            .bill-info {
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #000;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .total-row {
              font-weight: bold;
              background-color: #f9f9f9;
            }
            .summary {
              margin-top: 20px;
              border-top: 2px solid #000;
              padding-top: 10px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
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
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    
    const element = billRef.current
    if (!element) return

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`bill-${bill.billNumber}.pdf`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Bill
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <div ref={billRef} className="bg-white p-8 rounded-lg shadow-lg print:shadow-none">
        <div className="bill-header text-center border-b-2 border-black pb-4 mb-6">
          <div className="text-2xl font-bold">MedSync Hospital</div>
          <div className="text-sm text-gray-600 mt-1">
            123 Healthcare Street, Medical District<br />
            Phone: +91 1234567890 | Email: billing@medsync.com
          </div>
          <div className="text-xl font-bold mt-3">PATIENT BILL</div>
        </div>

        <div className="bill-info mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Bill Number:</strong> {bill.billNumber}</p>
              <p><strong>Patient Name:</strong> {patientName}</p>
              <p><strong>UHID:</strong> {patientUhid}</p>
            </div>
            <div className="text-right">
              <p><strong>Date:</strong> {new Date(bill.createdAt).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(bill.createdAt).toLocaleTimeString()}</p>
              <p><strong>Status:</strong> <span className={bill.status === 'paid' ? 'text-green-600' : 'text-orange-600'}>{bill.status.toUpperCase()}</span></p>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Service Description</th>
              <th>Qty</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item: any, index: number) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.serviceName}</td>
                <td>{item.quantity}</td>
                <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="text-right">{formatCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary">
          <div className="grid grid-cols-2 gap-4">
            <div></div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>- {formatCurrency(bill.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax ({(bill.taxRate * 100).toFixed(0)}%):</span>
                <span>{formatCurrency(bill.tax)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t-2 border-black pt-2">
                <span>Total Amount:</span>
                <span>{formatCurrency(bill.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {bill.status === 'paid' && bill.paymentMethod && (
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <p className="font-bold mb-2">Payment Details:</p>
            <div className="grid grid-cols-2 gap-2">
              <p><strong>Method:</strong> {bill.paymentMethod.toUpperCase()}</p>
              <p><strong>Date:</strong> {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : 'N/A'}</p>
              {bill.paymentDetails?.transactionId && (
                <p><strong>Transaction ID:</strong> {bill.paymentDetails.transactionId}</p>
              )}
              {bill.paymentDetails?.receivedAmount && (
                <>
                  <p><strong>Received:</strong> {formatCurrency(bill.paymentDetails.receivedAmount)}</p>
                  {bill.paymentDetails.changeAmount && bill.paymentDetails.changeAmount > 0 && (
                    <p><strong>Change:</strong> {formatCurrency(bill.paymentDetails.changeAmount)}</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="footer mt-8 text-center text-sm text-gray-600 border-t pt-4">
          <p>Thank you for choosing MedSync Hospital</p>
          <p className="mt-1">For any queries, please contact our billing department</p>
          <p className="mt-2 text-xs">This is a computer-generated bill and does not require a signature</p>
        </div>
      </div>
    </div>
  )
}
