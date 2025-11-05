import { NextRequest, NextResponse } from 'next/server'
import { printerManager } from '@/lib/utils/printer'

export async function POST(request: NextRequest) {
  try {
    const { labelData, printerName } = await request.json()
    
    if (!labelData || !printerName) {
      return NextResponse.json(
        { error: 'Label data and printer name are required' },
        { status: 400 }
      )
    }
    
    const printJob = await printerManager.printLabel(labelData, printerName)
    
    return NextResponse.json({
      success: true,
      jobId: printJob.id,
      status: printJob.status
    })
  } catch (error) {
    console.error('Error printing label:', error)
    return NextResponse.json(
      { error: 'Failed to print label' },
      { status: 500 }
    )
  }
}