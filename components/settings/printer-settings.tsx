'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { printerManager, type PrinterStatus, type PrintJob, type PrinterDevice } from '@/lib/utils/printer'
import { Printer, Wifi, WifiOff, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock } from 'lucide-react'

export function PrinterSettings() {
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null)

  const { data: availablePrinters = [], refetch: refetchPrinters, isLoading: detectingPrinters } = useQuery({
    queryKey: ['available-printers'],
    queryFn: async () => {
      const printers = await printerManager.detectPrinters()
      return printers.map(p => p.name)
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const { data: connectedPrinters = [] } = useQuery({
    queryKey: ['connected-printers'],
    queryFn: () => printerManager.getConnectedPrinters(),
    refetchInterval: 5000,
  })

  const { data: printQueue = [], refetch: refetchQueue } = useQuery({
    queryKey: ['print-queue'],
    queryFn: () => printerManager.getQueueStatus(),
    refetchInterval: 2000, // Refresh every 2 seconds
  })

  const detectPrintersMutation = useMutation({
    mutationFn: async () => {
      const printers = await printerManager.detectPrinters()
      return printers
    },
    onSuccess: () => {
      toast.success('Printer detection completed')
      refetchPrinters()
    },
    onError: () => {
      toast.error('Failed to detect printers')
    },
  })

  const testPrintMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPrinter) throw new Error('No printer selected')
      return printerManager.testPrint(selectedPrinter)
    },
    onSuccess: (job) => {
      toast.success('Test print job queued')
      refetchQueue()
    },
    onError: (error) => {
      toast.error(`Test print failed: ${error.message}`)
    },
  })

  const clearQueueMutation = useMutation({
    mutationFn: () => {
      printerManager.clearQueue()
      return Promise.resolve()
    },
    onSuccess: () => {
      toast.success('Print queue cleared')
      refetchQueue()
    },
  })

  const updatePrinterStatus = useCallback(async () => {
    if (selectedPrinter) {
      try {
        const status = await printerManager.getPrinterStatus(selectedPrinter)
        setPrinterStatus(status)
      } catch (error) {
        console.error('Failed to get printer status:', error)
      }
    }
  }, [selectedPrinter])

  useEffect(() => {
    updatePrinterStatus()
    
    // Set up interval to update status
    const interval = setInterval(updatePrinterStatus, 5000)
    return () => clearInterval(interval)
  }, [updatePrinterStatus])

  useEffect(() => {
    // Listen for printer manager events
    const handleJobCompleted = (job: PrintJob) => {
      toast.success(`Print job completed: ${job.labelData.orderNumber}`)
      refetchQueue()
    }

    const handleJobFailed = (job: PrintJob) => {
      toast.error(`Print job failed: ${job.error}`)
      refetchQueue()
    }

    const handlePrintersDetected = (printers: PrinterDevice[]) => {
      console.log('Printers detected:', printers)
      refetchPrinters()
    }

    printerManager.on('jobCompleted', handleJobCompleted)
    printerManager.on('jobFailed', handleJobFailed)
    printerManager.on('printersDetected', handlePrintersDetected)

    return () => {
      printerManager.off('jobCompleted', handleJobCompleted)
      printerManager.off('jobFailed', handleJobFailed)
      printerManager.off('printersDetected', handlePrintersDetected)
    }
  }, [refetchQueue, refetchPrinters])

  const getStatusIcon = (status: PrinterStatus) => {
    if (!status.connected) return <WifiOff className="h-4 w-4 text-red-500" />
    if (!status.ready) return <AlertCircle className="h-4 w-4 text-yellow-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getJobStatusColor = (status: PrintJob['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'printing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Printer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Thermal Printer Configuration
          </CardTitle>
          <CardDescription>
            Configure and manage thermal printers for shipping label printing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                <SelectTrigger>
                  <SelectValue placeholder={detectingPrinters ? "Detecting printers..." : "Select a printer"} />
                </SelectTrigger>
                <SelectContent>
                  {availablePrinters.map((printer: string) => (
                    <SelectItem key={printer} value={printer}>
                      {printer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={() => detectPrintersMutation.mutate()}
              disabled={detectPrintersMutation.isPending}
            >
              {detectPrintersMutation.isPending ? 'Detecting...' : 'Refresh Printers'}
            </Button>
          </div>

          {/* Connected Printers Summary */}
          {connectedPrinters.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Connected Printers ({connectedPrinters.length})</h4>
              <div className="space-y-1">
                {connectedPrinters.map((printer: PrinterDevice) => (
                  <div key={printer.name} className="flex items-center justify-between text-xs">
                    <span>{printer.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{printer.type.toUpperCase()}</span>
                      {printer.isConnected ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedPrinter && printerStatus && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{selectedPrinter}</h3>
                {getStatusIcon(printerStatus)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className={printerStatus.ready ? 'text-green-600' : 'text-red-600'}>
                    {printerStatus.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Connection:</span>{' '}
                  <span className={printerStatus.connected ? 'text-green-600' : 'text-red-600'}>
                    {printerStatus.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paper:</span>{' '}
                  <span className={
                    printerStatus.paperStatus === 'ok' ? 'text-green-600' : 
                    printerStatus.paperStatus === 'low' ? 'text-yellow-600' : 'text-red-600'
                  }>
                    {printerStatus.paperStatus.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Temperature:</span>{' '}
                  <span className={printerStatus.temperature === 'normal' ? 'text-green-600' : 'text-yellow-600'}>
                    {printerStatus.temperature.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {printerStatus.model && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Model: {printerStatus.model}
                  {printerStatus.serialNumber && ` • S/N: ${printerStatus.serialNumber}`}
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testPrintMutation.mutate()}
                  disabled={!printerStatus.ready || testPrintMutation.isPending}
                >
                  {testPrintMutation.isPending ? 'Printing...' : 'Test Print'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Print Queue</CardTitle>
          <CardDescription>
            Monitor active and recent print jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {printQueue.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No print jobs</h3>
              <p className="text-muted-foreground">
                Print jobs will appear here when labels are sent to the printer.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {printQueue.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      Order {job.labelData.orderNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.createdAt.toLocaleTimeString()}
                      {job.completedAt && ` - ${job.completedAt.toLocaleTimeString()}`}
                    </div>
                    {job.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {job.error}
                      </div>
                    )}
                  </div>
                  <Badge className={getJobStatusColor(job.status)}>
                    {job.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          
          {printQueue.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => clearQueueMutation.mutate()}
                  disabled={clearQueueMutation.isPending}
                >
                  {clearQueueMutation.isPending ? 'Clearing...' : 'Clear Queue'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}