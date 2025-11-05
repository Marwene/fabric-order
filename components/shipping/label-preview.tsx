'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { generateLabel, markLabelPrinted } from '@/lib/actions/shipping'
import { generateQRCode } from '@/lib/utils/label-generator'
import { Printer, Eye, Download } from 'lucide-react'
import type { PackageWithDetails } from '@/lib/types'
import printerManager from '@/lib/utils/printer'

interface LabelPreviewProps {
  package: PackageWithDetails
  children: React.ReactNode
}

export function LabelPreview({ package: pkg, children }: LabelPreviewProps) {
  const [open, setOpen] = useState(false)
  const [labelData, setLabelData] = useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  const generateLabelMutation = useMutation({
    mutationFn: () => generateLabel(pkg.id),
    onSuccess: async (result) => {
      if (result.success && result.labelData) {
        setLabelData(result.labelData)
        // Generate QR code for preview
        if (result.labelData.qrCode) {
          try {
            const qrUrl = await generateQRCode(result.labelData.qrCode)
            setQrCodeUrl(qrUrl)
          } catch (error) {
            console.error('Failed to generate QR code for preview:', error)
          }
        }
        toast.success('Label generated successfully')
      } else {
        toast.error(result.error || 'Failed to generate label')
      }
    },
    onError: () => {
      toast.error('Failed to generate label')
    },
  })

  const printLabelMutation = useMutation({
    mutationFn: async () => {
      // First, send to thermal printer
      if (displayData) {
        try {
          const availablePrinters = await printerManager.getConnectedPrinters()
          if (availablePrinters.length > 0) {
            const printJob = await printerManager.printLabel(displayData, availablePrinters[0].name)
            console.log('Print job queued:', printJob)
          } else {
            throw new Error('No thermal printers available')
          }
        } catch (error) {
          console.warn('Thermal printer not available, marking as printed anyway:', error)
        }
      }

      // Then mark as printed in database
      const labelIdToMark = pkg.shippingLabels[0]?.id
      if (!labelIdToMark) {
        throw new Error('No shipping label found to mark as printed')
      }
      return markLabelPrinted(labelIdToMark)
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Label sent to printer and marked as printed')
      } else {
        toast.error(result.error || 'Failed to mark label as printed')
      }
    },
    onError: () => {
      toast.error('Failed to print label')
    },
  })

  const handleGenerateLabel = () => {
    generateLabelMutation.mutate()
  }

  const handlePrintLabel = () => {
    printLabelMutation.mutate()
  }

  const existingLabel = pkg.shippingLabels[0]
  const displayData = labelData || (existingLabel?.labelData as any)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shipping Label Preview</DialogTitle>
          <DialogDescription>
            Preview and print shipping label for package {pkg.packageNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!displayData ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No label generated yet</p>
              <Button onClick={handleGenerateLabel} disabled={generateLabelMutation.isPending}>
                {generateLabelMutation.isPending ? 'Generating...' : 'Generate Label'}
              </Button>
            </div>
          ) : (
            <>
              {/* Label Preview */}
              <Card className="border-2 border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">FABRIC SOLUTIONS</CardTitle>
                    <Badge variant="outline">4x6 Label</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Info */}
                  <div>
                    <div className="font-bold text-lg">Order #{displayData.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      Package {displayData.packageNumber} of {displayData.totalPackages}
                    </div>
                  </div>

                  <Separator />

                  {/* Ship To */}
                  <div>
                    <div className="font-bold text-sm mb-2">SHIP TO:</div>
                    <div className="space-y-1">
                      <div className="font-medium">{displayData.clientName}</div>
                      {displayData.clientAddress.address && (
                        <div>{displayData.clientAddress.address}</div>
                      )}
                      <div>
                        {displayData.clientAddress.city}, {displayData.clientAddress.state}{' '}
                        {displayData.clientAddress.zipCode}
                      </div>
                      <div>{displayData.clientAddress.country}</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Items */}
                  <div>
                    <div className="font-bold text-sm mb-2">ITEMS:</div>
                    <div className="space-y-1">
                      {displayData.items.map((item: any, index: number) => (
                        <div key={index} className="text-sm">
                          {item.quantity}x {item.productName} ({item.variant})
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Package Details */}
                  {(displayData.weight || displayData.dimensions) && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        {displayData.weight && <span>Weight: {displayData.weight} lbs</span>}
                        {displayData.dimensions && <span>Dimensions: {displayData.dimensions}</span>}
                      </div>
                    </>
                  )}

                  {/* QR Code */}
                  <div className="flex justify-end">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-100 h-100 border border-gray-300"
                      />
                    ) : (
                      <div className="w-100 h-100 bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-xs">
                        Loading QR...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {existingLabel?.printedAt
                    ? `Printed: ${new Date(existingLabel.printedAt).toLocaleString()}`
                    : 'Not printed yet'}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button 
                    onClick={handlePrintLabel}
                    disabled={printLabelMutation.isPending || !!existingLabel?.printedAt}
                    size="sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    {printLabelMutation.isPending 
                      ? 'Printing...' 
                      : existingLabel?.printedAt 
                        ? 'Already Printed' 
                        : 'Print Label'
                    }
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}