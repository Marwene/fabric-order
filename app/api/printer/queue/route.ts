import { NextRequest, NextResponse } from 'next/server'
import { printerManager } from '@/lib/utils/printer'

export async function GET() {
  try {
    const queue = printerManager.getQueueStatus()
    
    return NextResponse.json({
      success: true,
      queue: queue.map(job => ({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error,
        printerName: job.printerName,
        retryCount: job.retryCount,
        orderNumber: job.labelData.orderNumber
      }))
    })
  } catch (error) {
    console.error('Error getting print queue:', error)
    return NextResponse.json(
      { error: 'Failed to get print queue' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    printerManager.clearQueue()
    
    return NextResponse.json({
      success: true,
      message: 'Print queue cleared'
    })
  } catch (error) {
    console.error('Error clearing print queue:', error)
    return NextResponse.json(
      { error: 'Failed to clear print queue' },
      { status: 500 }
    )
  }
}