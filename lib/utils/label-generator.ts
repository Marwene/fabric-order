import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import type { LabelData } from '@/lib/types'
import { printerManager } from './printer'

export async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data)
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

export async function printLabelDirectly(labelData: LabelData, printerName?: string): Promise<boolean> {
  try {
    const connectedPrinters = await printerManager.getConnectedPrinters()
    
    if (connectedPrinters.length === 0) {
      throw new Error('No thermal printers connected')
    }
    
    const targetPrinter = printerName 
      ? connectedPrinters.find(p => p.name === printerName)
      : connectedPrinters[0]
    
    if (!targetPrinter) {
      throw new Error(`Printer ${printerName} not found`)
    }
    
    const printJob = await printerManager.printLabel(labelData, targetPrinter.name)
    
    return printJob.status !== 'failed'
  } catch (error) {
    console.error('Failed to print label directly:', error)
    return false
  }
}

export async function generateShippingLabel(data: LabelData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([400, 600]) // 4x6 inch label at 100 DPI

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Generate QR code (data.qrCode is now a URL string)
    const qrCodeDataUrl = await generateQRCode(data.qrCode)
    const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl)

    const { width, height } = page.getSize()
    let yPosition = height - 40
    
    // Company header
    page.drawText('FABRIC SOLUTIONS', {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 25
    
    // Order information
    page.drawText(`Order #: ${data.orderNumber}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 20
    
    // Package info
    page.drawText(`Package ${data.packageNumber} of ${data.totalPackages}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30
    
    // Client info
    page.drawText('SHIP TO:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 20
    
    page.drawText(data.clientName, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 15
    
    if (data.clientAddress.address) {
      page.drawText(data.clientAddress.address, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      })
      yPosition -= 15
    }
    
    const cityStateZip = `${data.clientAddress.city}, ${data.clientAddress.state} ${data.clientAddress.zipCode}`
    page.drawText(cityStateZip, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30
    
    // Items
    page.drawText('ITEMS:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 20
    
    for (const item of data.items) {
      const itemText = `${item.quantity}x ${item.productName} (${item.variant})`
      page.drawText(itemText, {
        x: 50,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      })
      yPosition -= 15
    }
    
    // Weight and dimensions
    if (data.weight) {
      yPosition -= 10
      page.drawText(`Weight: ${data.weight} lbs`, {
        x: 50,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      })
      yPosition -= 15
    }
    
    if (data.dimensions) {
      page.drawText(`Dimensions: ${data.dimensions}`, {
        x: 50,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      })
    }
    
    // QR Code
    page.drawImage(qrCodeImage, {
      x: width - 120,
      y: height - 120,
      width: 80,
      height: 80,
    })
    
    return await pdfDoc.save()
  } catch (error) {
    console.error('Failed to generate shipping label:', error)
    throw new Error('Failed to generate shipping label')
  }
}