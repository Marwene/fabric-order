import { NextResponse } from 'next/server'
import { printerManager } from '@/lib/utils/printer'

export async function POST() {
  try {
    const printers = await printerManager.detectPrinters()
    
    return NextResponse.json({
      success: true,
      printers: printers.map(printer => ({
        name: printer.name,
        type: printer.type,
        port: printer.port,
        isConnected: printer.isConnected,
        model: printer.model,
        capabilities: printer.capabilities
      }))
    })
  } catch (error) {
    console.error('Error detecting printers:', error)
    return NextResponse.json(
      { error: 'Failed to detect printers' },
      { status: 500 }
    )
  }
}