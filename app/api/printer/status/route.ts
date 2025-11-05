import { NextRequest, NextResponse } from 'next/server'
import { printerManager } from '@/lib/utils/printer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const printerName = searchParams.get('printer')
    
    if (!printerName) {
      return NextResponse.json({ error: 'Printer name is required' }, { status: 400 })
    }
    
    const status = await printerManager.getPrinterStatus(printerName)
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting printer status:', error)
    return NextResponse.json(
      { error: 'Failed to get printer status' },
      { status: 500 }
    )
  }
}