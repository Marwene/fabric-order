'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/database'

const QualityCheckSchema = z.object({
  orderId: z.string().min(1),
  checkType: z.string().min(1),
  status: z.enum(['PASSED', 'FAILED', 'PENDING']),
  inspector: z.string().min(1),
  notes: z.string().optional(),
})

export async function addQualityCheck(data: {
  orderId: string
  checkType: string
  status: string
  inspector: string
  notes?: string
}) {
  try {
    const validatedData = QualityCheckSchema.parse(data)
    
    const qualityCheck = await prisma.qualityCheck.create({
      data: validatedData,
    })
    
    revalidatePath(`/production/${validatedData.orderId}`)
    return { success: true, qualityCheck }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    
    console.error('Failed to add quality check:', error)
    return { success: false, error: 'Failed to add quality check' }
  }
}

export async function getQualityChecks(orderId: string) {
  try {
    return await prisma.qualityCheck.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Failed to fetch quality checks:', error)
    throw new Error('Failed to fetch quality checks')
  }
}

export async function updateQualityCheck(id: string, data: {
  status?: 'PASSED' | 'FAILED' | 'PENDING'
  notes?: string
}) {
  try {
    const qualityCheck = await prisma.qualityCheck.update({
      where: { id },
      data,
    })
    
    revalidatePath(`/production/${qualityCheck.orderId}`)
    return { success: true, qualityCheck }
  } catch (error) {
    console.error('Failed to update quality check:', error)
    return { success: false, error: 'Failed to update quality check' }
  }
}