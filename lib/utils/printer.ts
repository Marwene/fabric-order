import { EventEmitter } from 'events'
// USB and Serial communication for thermal printers
let usb: any = null
let SerialPort: any = null
let ThermalPrinter: any = null

// Dynamic imports for Node.js environment
const initializePrinterLibraries = async () => {
  if (typeof window === 'undefined') {
    try {
      usb = (await import('usb')).default
      SerialPort = (await import('serialport')).SerialPort
      ThermalPrinter = (await import('node-thermal-printer')).ThermalPrinter
      
      // Initialize USB
      usb.on('attach', (device: any) => {
        console.log('USB device attached:', device)
        printerManager.detectPrinters()
      })
      
      usb.on('detach', (device: any) => {
        console.log('USB device detached:', device)
        printerManager.detectPrinters()
      })
    } catch (error) {
      console.warn('Printer libraries not available in this environment:', error)
    }
  }
}

// Initialize libraries on module load
initializePrinterLibraries()

export interface PrinterStatus {
  connected: boolean
  ready: boolean
  error?: string
  paperStatus: 'ok' | 'low' | 'out'
  temperature: 'normal' | 'hot' | 'cold'
  model?: string
  serialNumber?: string
}

export interface PrintJob {
  id: string
  labelData: any
  status: 'pending' | 'printing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  error?: string
  printerName: string
  retryCount: number
}

export interface PrinterDevice {
  name: string
  port: string
  type: 'usb' | 'serial' | 'network'
  vendorId?: number
  productId?: number
  isConnected: boolean
  model?: string
  capabilities: string[]
}

// Known thermal printer vendor/product IDs
const THERMAL_PRINTER_IDS = [
  // TSC Printers
  { vendorId: 0x1203, productId: 0x0140, name: 'TSC TTP-244 Pro' },
  { vendorId: 0x1203, productId: 0x0141, name: 'TSC TTP-342 Pro' },
  { vendorId: 0x1203, productId: 0x0142, name: 'TSC TTP-644M Pro' },
  
  // Zebra Printers
  { vendorId: 0x0a5f, productId: 0x0050, name: 'Zebra GX420d' },
  { vendorId: 0x0a5f, productId: 0x0051, name: 'Zebra GX430t' },
  { vendorId: 0x0a5f, productId: 0x0052, name: 'Zebra ZD410' },
  
  // DYMO Printers
  { vendorId: 0x0922, productId: 0x0020, name: 'DYMO LabelWriter 450' },
  { vendorId: 0x0922, productId: 0x0021, name: 'DYMO LabelWriter 4XL' },
  
  // Citizen Printers
  { vendorId: 0x1d90, productId: 0x2068, name: 'Citizen CT-S310A' },
  { vendorId: 0x1d90, productId: 0x2069, name: 'Citizen CT-S4000' },
  
  // Star Micronics
  { vendorId: 0x0519, productId: 0x0001, name: 'Star TSP143III' },
  { vendorId: 0x0519, productId: 0x0002, name: 'Star TSP654II' },
]

class ThermalPrinterManager extends EventEmitter {
  private printQueue: PrintJob[] = []
  private isProcessing = false
  private connectedPrinters: Map<string, PrinterDevice> = new Map()
  private printerInstances: Map<string, any> = new Map()
  private maxRetries = 3
  private retryDelay = 2000

  constructor() {
    super()
    this.initializeManager()
  }

  private async initializeManager() {
    await initializePrinterLibraries()
    await this.detectPrinters()
    
    // Start queue processor
    setInterval(() => this.processQueue(), 1000)
  }

  async detectPrinters(): Promise<PrinterDevice[]> {
    const detectedPrinters: PrinterDevice[] = []
    
    try {
      // Detect USB thermal printers
      if (usb) {
        const usbPrinters = await this.detectUSBPrinters()
        detectedPrinters.push(...usbPrinters)
      }
      
      // Detect Serial port printers
      if (SerialPort) {
        const serialPrinters = await this.detectSerialPrinters()
        detectedPrinters.push(...serialPrinters)
      }
      
      // Update connected printers map
      this.connectedPrinters.clear()
      detectedPrinters.forEach(printer => {
        this.connectedPrinters.set(printer.name, printer)
      })
      
      this.emit('printersDetected', detectedPrinters)
      return detectedPrinters
      
    } catch (error) {
      console.error('Error detecting printers:', error)
      return []
    }
  }

  private async detectUSBPrinters(): Promise<PrinterDevice[]> {
    const usbPrinters: PrinterDevice[] = []
    
    try {
      const devices = usb.getDeviceList()
      
      for (const device of devices) {
        const descriptor = device.deviceDescriptor
        const printerInfo = THERMAL_PRINTER_IDS.find(
          p => p.vendorId === descriptor.idVendor && p.productId === descriptor.idProduct
        )
        
        if (printerInfo) {
          try {
            device.open()
            const manufacturer = await this.getStringDescriptor(device, descriptor.iManufacturer)
            const product = await this.getStringDescriptor(device, descriptor.iProduct)
            const serialNumber = await this.getStringDescriptor(device, descriptor.iSerialNumber)
            
            usbPrinters.push({
              name: printerInfo.name,
              port: `USB:${descriptor.idVendor}:${descriptor.idProduct}`,
              type: 'usb',
              vendorId: descriptor.idVendor,
              productId: descriptor.idProduct,
              isConnected: true,
              model: `${manufacturer} ${product}`.trim(),
              capabilities: ['text', 'graphics', 'barcode', 'qrcode']
            })
            
            device.close()
          } catch (error) {
            console.warn(`Failed to query USB device ${printerInfo.name}:`, error)
          }
        }
      }
    } catch (error) {
      console.error('USB detection error:', error)
    }
    
    return usbPrinters
  }

  private async detectSerialPrinters(): Promise<PrinterDevice[]> {
    const serialPrinters: PrinterDevice[] = []
    
    try {
      const ports = await SerialPort.list()
      
      for (const port of ports) {
        // Check if it's likely a thermal printer
        if (this.isLikelyThermalPrinter(port)) {
          serialPrinters.push({
            name: `Serial Printer (${port.path})`,
            port: port.path,
            type: 'serial',
            isConnected: true,
            model: port.manufacturer || 'Unknown',
            capabilities: ['text', 'graphics']
          })
        }
      }
    } catch (error) {
      console.error('Serial port detection error:', error)
    }
    
    return serialPrinters
  }

  private isLikelyThermalPrinter(port: any): boolean {
    const thermalPrinterIndicators = [
      'tsc', 'zebra', 'dymo', 'citizen', 'star', 'thermal', 'label'
    ]
    
    const portInfo = `${port.manufacturer || ''} ${port.product || ''} ${port.path || ''}`.toLowerCase()
    return thermalPrinterIndicators.some(indicator => portInfo.includes(indicator))
  }

  private async getStringDescriptor(device: any, index: number): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!index) {
        resolve('')
        return
      }
      
      device.getStringDescriptor(index, (error: any, data: Buffer) => {
        if (error) {
          resolve('')
        } else {
          resolve(data.toString())
        }
      })
    })
  }

  async getPrinterStatus(printerName: string): Promise<PrinterStatus> {
    const printer = this.connectedPrinters.get(printerName)
    
    if (!printer) {
      return {
        connected: false,
        ready: false,
        error: 'Printer not found',
        paperStatus: 'out',
        temperature: 'normal'
      }
    }

    try {
      const printerInstance = await this.getPrinterInstance(printer)
      
      if (!printerInstance) {
        return {
          connected: false,
          ready: false,
          error: 'Failed to connect to printer',
          paperStatus: 'out',
          temperature: 'normal'
        }
      }

      // Query printer status (implementation varies by printer type)
      const status = await this.queryPrinterStatus(printerInstance, printer)
      
      return {
        connected: true,
        ready: status.ready,
        error: status.error,
        paperStatus: status.paperStatus || 'ok',
        temperature: status.temperature || 'normal',
        model: printer.model,
        serialNumber: status.serialNumber
      }
      
    } catch (error) {
      return {
        connected: false,
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        paperStatus: 'out',
        temperature: 'normal'
      }
    }
  }

  private async getPrinterInstance(printer: PrinterDevice): Promise<any> {
    const cacheKey = printer.name
    
    if (this.printerInstances.has(cacheKey)) {
      return this.printerInstances.get(cacheKey)
    }

    try {
      let printerInstance: any = null

      if (printer.type === 'usb' && ThermalPrinter) {
        printerInstance = new ThermalPrinter({
          type: 'epson',
          interface: `usb://${printer.vendorId}:${printer.productId}`,
          options: {
            timeout: 5000
          }
        })
      } else if (printer.type === 'serial' && SerialPort) {
        const serialPort = new SerialPort({
          path: printer.port,
          baudRate: 9600,
          dataBits: 8,
          parity: 'none',
          stopBits: 1
        })
        
        printerInstance = {
          port: serialPort,
          write: (data: Buffer) => serialPort.write(data),
          close: () => serialPort.close()
        }
      }

      if (printerInstance) {
        this.printerInstances.set(cacheKey, printerInstance)
      }

      return printerInstance
    } catch (error) {
      console.error(`Failed to create printer instance for ${printer.name}:`, error)
      return null
    }
  }

  private async queryPrinterStatus(printerInstance: any, printer: PrinterDevice): Promise<any> {
    try {
      // ESC/POS status query commands
      const statusCommands = {
        realTimeStatus: Buffer.from([0x10, 0x04, 0x01]), // DLE EOT 1
        paperStatus: Buffer.from([0x10, 0x04, 0x04]),    // DLE EOT 4
        drawerStatus: Buffer.from([0x10, 0x04, 0x02])    // DLE EOT 2
      }

      // Send status query and wait for response
      if (printerInstance.write) {
        printerInstance.write(statusCommands.realTimeStatus)
        
        // Wait for response (simplified - real implementation would handle async responses)
        await new Promise(resolve => setTimeout(resolve, 500))
        
        return {
          ready: true,
          paperStatus: 'ok',
          temperature: 'normal'
        }
      }

      return { ready: true }
    } catch (error) {
      return {
        ready: false,
        error: error instanceof Error ? error.message : 'Status query failed'
      }
    }
  }

  async printLabel(labelData: any, printerName: string): Promise<PrintJob> {
    const job: PrintJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      labelData,
      status: 'pending',
      createdAt: new Date(),
      printerName,
      retryCount: 0
    }

    this.printQueue.push(job)
    this.emit('jobQueued', job)
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }

    return job
  }

  private async processQueue() {
    if (this.isProcessing || this.printQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift()!
      
      try {
        job.status = 'printing'
        this.emit('jobStatusChanged', job)
        
        await this.executePrintJob(job)
        
        job.status = 'completed'
        job.completedAt = new Date()
        this.emit('jobCompleted', job)
        
      } catch (error) {
        job.retryCount++
        
        if (job.retryCount < this.maxRetries) {
          // Retry the job
          job.status = 'pending'
          this.printQueue.unshift(job) // Put back at front of queue
          await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        } else {
          job.status = 'failed'
          job.error = error instanceof Error ? error.message : 'Unknown error'
          job.completedAt = new Date()
          this.emit('jobFailed', job)
        }
      }
    }

    this.isProcessing = false
  }

  private async executePrintJob(job: PrintJob): Promise<void> {
    const printer = this.connectedPrinters.get(job.printerName)
    
    if (!printer) {
      throw new Error(`Printer ${job.printerName} not found`)
    }

    const printerInstance = await this.getPrinterInstance(printer)
    
    if (!printerInstance) {
      throw new Error(`Failed to connect to printer ${job.printerName}`)
    }

    // Generate print commands based on printer type
    let printData: Buffer

    if (printer.name.toLowerCase().includes('zebra')) {
      printData = this.generateZPLCommands(job.labelData)
    } else if (printer.name.toLowerCase().includes('tsc')) {
      printData = this.generateTSPLCommands(job.labelData)
    } else {
      printData = this.generateESCPOSCommands(job.labelData)
    }

    // Send data to printer
    await this.sendToPrinter(printerInstance, printData)
  }

  private generateESCPOSCommands(labelData: any): Buffer {
    const commands: number[] = []
    
    // Initialize printer
    commands.push(0x1B, 0x40) // ESC @
    
    // Set character set
    commands.push(0x1B, 0x74, 0x00) // ESC t 0 (PC437)
    
    // Company header
    commands.push(0x1B, 0x61, 0x01) // ESC a 1 (center align)
    commands.push(0x1D, 0x21, 0x11) // GS ! 17 (double width/height)
    commands.push(...Array.from(new TextEncoder().encode('FABRIC SOLUTIONS\n')))
    
    // Reset formatting
    commands.push(0x1D, 0x21, 0x00) // GS ! 0 (normal size)
    commands.push(0x1B, 0x61, 0x00) // ESC a 0 (left align)
    
    // Order information
    commands.push(...Array.from(new TextEncoder().encode(`\nOrder: ${labelData.orderNumber}\n`)))
    commands.push(...Array.from(new TextEncoder().encode(`Package: ${labelData.packageNumber} of ${labelData.totalPackages}\n\n`)))
    
    // Ship to information
    commands.push(0x1B, 0x45, 0x01) // ESC E 1 (bold on)
    commands.push(...Array.from(new TextEncoder().encode('SHIP TO:\n')))
    commands.push(0x1B, 0x45, 0x00) // ESC E 0 (bold off)
    
    commands.push(...Array.from(new TextEncoder().encode(`${labelData.clientName}\n`)))
    
    if (labelData.clientAddress.address) {
      commands.push(...Array.from(new TextEncoder().encode(`${labelData.clientAddress.address}\n`)))
    }
    
    const cityStateZip = `${labelData.clientAddress.city}, ${labelData.clientAddress.state} ${labelData.clientAddress.zipCode}`
    commands.push(...Array.from(new TextEncoder().encode(`${cityStateZip}\n`)))
    commands.push(...Array.from(new TextEncoder().encode(`${labelData.clientAddress.country}\n\n`)))
    
    // Items
    commands.push(0x1B, 0x45, 0x01) // ESC E 1 (bold on)
    commands.push(...Array.from(new TextEncoder().encode('ITEMS:\n')))
    commands.push(0x1B, 0x45, 0x00) // ESC E 0 (bold off)
    
    for (const item of labelData.items) {
      const itemText = `${item.quantity}x ${item.productName} (${item.variant})\n`
      commands.push(...Array.from(new TextEncoder().encode(itemText)))
    }
    
    // Weight and dimensions
    if (labelData.weight) {
      commands.push(...Array.from(new TextEncoder().encode(`\nWeight: ${labelData.weight} lbs\n`)))
    }
    
    if (labelData.dimensions) {
      commands.push(...Array.from(new TextEncoder().encode(`Dimensions: ${labelData.dimensions}\n`)))
    }
    
    // QR Code (if supported)
    if (labelData.qrCode) {
      commands.push(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00) // QR Code setup
      const qrData = `ORDER:${labelData.orderNumber}-PKG:${labelData.packageNumber}`
      commands.push(0x1D, 0x28, 0x6B, qrData.length + 3, 0x00, 0x31, 0x50, 0x30)
      commands.push(...Array.from(new TextEncoder().encode(qrData)))
      commands.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30) // Print QR code
    }
    
    // Cut paper
    commands.push(0x0A, 0x0A, 0x0A) // Line feeds
    commands.push(0x1D, 0x56, 0x00) // GS V 0 (full cut)
    
    return Buffer.from(commands)
  }

  private generateZPLCommands(labelData: any): Buffer {
    const zpl = `
^XA
^CF0,30
^FO50,50^FD FABRIC SOLUTIONS^FS
^CF0,20
^FO50,100^FDOrder: ${labelData.orderNumber}^FS
^FO50,130^FDPackage: ${labelData.packageNumber} of ${labelData.totalPackages}^FS

^FO50,180^FDSHIP TO:^FS
^FO50,210^FD${labelData.clientName}^FS
${labelData.clientAddress.address ? `^FO50,240^FD${labelData.clientAddress.address}^FS` : ''}
^FO50,270^FD${labelData.clientAddress.city}, ${labelData.clientAddress.state} ${labelData.clientAddress.zipCode}^FS
^FO50,300^FD${labelData.clientAddress.country}^FS

^FO50,350^FDITEMS:^FS
${labelData.items.map((item: any, index: number) => 
  `^FO50,${380 + (index * 30)}^FD${item.quantity}x ${item.productName} (${item.variant})^FS`
).join('')}

${labelData.weight ? `^FO50,${450 + (labelData.items.length * 30)}^FDWeight: ${labelData.weight} lbs^FS` : ''}
${labelData.dimensions ? `^FO50,${480 + (labelData.items.length * 30)}^FDDimensions: ${labelData.dimensions}^FS` : ''}

^FO400,50^BQN,2,4^FDMA,ORDER:${labelData.orderNumber}-PKG:${labelData.packageNumber}^FS

^XZ
    `.trim()
    
    return Buffer.from(zpl, 'utf8')
  }

  private generateTSPLCommands(labelData: any): Buffer {
    const tspl = `
SIZE 4,6
GAP 0.12,0
DIRECTION 1
REFERENCE 0,0
OFFSET 0mm
SET PEEL OFF
SET CUTTER OFF
SET PARTIAL_CUTTER OFF
SET TEAR ON
CLEAR

TEXT 50,50,"3",0,1,1,"FABRIC SOLUTIONS"
TEXT 50,100,"2",0,1,1,"Order: ${labelData.orderNumber}"
TEXT 50,130,"2",0,1,1,"Package: ${labelData.packageNumber} of ${labelData.totalPackages}"

TEXT 50,180,"2",0,1,1,"SHIP TO:"
TEXT 50,210,"2",0,1,1,"${labelData.clientName}"
${labelData.clientAddress.address ? `TEXT 50,240,"2",0,1,1,"${labelData.clientAddress.address}"` : ''}
TEXT 50,270,"2",0,1,1,"${labelData.clientAddress.city}, ${labelData.clientAddress.state} ${labelData.clientAddress.zipCode}"
TEXT 50,300,"2",0,1,1,"${labelData.clientAddress.country}"

TEXT 50,350,"2",0,1,1,"ITEMS:"
${labelData.items.map((item: any, index: number) => 
  `TEXT 50,${380 + (index * 30)},"1",0,1,1,"${item.quantity}x ${item.productName} (${item.variant})"`
).join('\n')}

${labelData.weight ? `TEXT 50,${450 + (labelData.items.length * 30)},"1",0,1,1,"Weight: ${labelData.weight} lbs"` : ''}
${labelData.dimensions ? `TEXT 50,${480 + (labelData.items.length * 30)},"1",0,1,1,"Dimensions: ${labelData.dimensions}"` : ''}

QRCODE 400,50,H,4,A,0,"ORDER:${labelData.orderNumber}-PKG:${labelData.packageNumber}"

PRINT 1,1
    `.trim()
    
    return Buffer.from(tspl, 'utf8')
  }

  private async sendToPrinter(printerInstance: any, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (printerInstance.write) {
        printerInstance.write(data, (error: any) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      } else if (printerInstance.execute) {
        // For node-thermal-printer
        printerInstance.execute()
          .then(() => resolve())
          .catch(reject)
      } else {
        reject(new Error('Printer instance does not support writing'))
      }
    })
  }

  getQueueStatus(): PrintJob[] {
    return [...this.printQueue]
  }

  clearQueue(): void {
    this.printQueue = []
    this.emit('queueCleared')
  }

  getConnectedPrinters(): PrinterDevice[] {
    return Array.from(this.connectedPrinters.values())
  }

  async testPrint(printerName: string): Promise<PrintJob> {
    const testLabel = {
      orderNumber: 'TEST-001',
      clientName: 'Test Client',
      clientAddress: {
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      packageNumber: 1,
      totalPackages: 1,
      items: [
        { productName: 'Test T-Shirt', variant: 'M Black Cotton', quantity: 1 }
      ],
      weight: 1.0,
      dimensions: '10 x 8 x 2'
    }

    return this.printLabel(testLabel, printerName)
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    // Close all printer connections
    for (const [name, instance] of this.printerInstances) {
      try {
        if (instance.close) {
          await instance.close()
        }
      } catch (error) {
        console.warn(`Error closing printer ${name}:`, error)
      }
    }
    
    this.printerInstances.clear()
    this.connectedPrinters.clear()
    this.printQueue = []
  }
}

// Singleton instance
export const printerManager = new ThermalPrinterManager()

// USB communication utilities for direct printer access
export async function initializeUSBPrinter(vendorId: number, productId: number): Promise<boolean> {
  try {
    if (!usb) {
      throw new Error('USB library not available')
    }

    const device = usb.findByIds(vendorId, productId)
    
    if (!device) {
      throw new Error('Printer device not found')
    }

    device.open()
    
    // Claim interface (usually interface 0 for printers)
    const interface_ = device.interface(0)
    
    if (interface_.isKernelDriverActive()) {
      interface_.detachKernelDriver()
    }
    
    interface_.claim()
    
    console.log(`USB printer initialized: ${vendorId}:${productId}`)
    return true
    
  } catch (error) {
    console.error('Failed to initialize USB printer:', error)
    return false
  }
}

export async function sendRawDataToPrinter(data: Buffer, vendorId: number, productId: number): Promise<boolean> {
  try {
    if (!usb) {
      throw new Error('USB library not available')
    }

    const device = usb.findByIds(vendorId, productId)
    
    if (!device) {
      throw new Error('Printer device not found')
    }

    const interface_ = device.interface(0)
    const endpoint = interface_.endpoints.find((ep: any) => ep.direction === 'out')
    
    if (!endpoint) {
      throw new Error('Output endpoint not found')
    }

    return new Promise((resolve, reject) => {
      endpoint.transfer(data, (error: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(true)
        }
      })
    })
    
  } catch (error) {
    console.error('Failed to send data to printer:', error)
    return false
  }
}

// Export printer manager instance and utilities
export default printerManager