'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/database'
import type { ProductionUpdateFormData } from '@/lib/types'
import { format, subDays } from 'date-fns'

const ProductionUpdateSchema = z.object({
  orderId: z.string().min(1),
  itemsProduced: z.record(z.string(), z.number().min(0)),
  notes: z.string().optional(),
})

export async function addProductionUpdate(data: ProductionUpdateFormData) {
  try {
    const validatedData = ProductionUpdateSchema.parse(data)
    
    // Update order items with new produced quantities
    const updatePromises = Object.entries(validatedData.itemsProduced).map(
      async ([variantId, quantity]) => {
        const orderItem = await prisma.orderItem.findFirst({
          where: {
            orderId: validatedData.orderId,
            variantId,
          },
        })
        
        if (orderItem && quantity > 0) {
          return prisma.orderItem.update({
            where: { id: orderItem.id },
            data: {
              producedQty: {
                increment: quantity,
              },
            },
          })
        }
      }
    )
    
    await Promise.all(updatePromises)
    
    // Create production update record
    const update = await prisma.productionUpdate.create({
      data: {
        orderId: validatedData.orderId,
        itemsProduced: validatedData.itemsProduced,
        notes: validatedData.notes,
        createdBy: 'system', // TODO: Replace with actual user ID
      },
    })
    
    // Check if order is complete
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: { orderItems: true },
    })
    
    if (order) {
      const isComplete = order.orderItems.every(
        item => item.producedQty >= item.quantity
      )
      
      if (isComplete && order.status === 'IN_PROGRESS') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'COMPLETED' },
        })
      }
    }
    
    revalidatePath('/orders')
    revalidatePath(`/orders/${validatedData.orderId}`)
    revalidatePath('/production')
    
    return { success: true, update }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    
    console.error('Failed to add production update:', error)
    return { success: false, error: 'Failed to add production update' }
  }
}

export async function getProductionOrders() {
  try {
    return await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      include: {
        client: true,
        orderItems: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        packages: {
          include: { shippingLabels: true },
        },
        productionUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  } catch (error) {
    console.error('Failed to fetch production orders:', error)
    throw new Error('Failed to fetch production orders')
  }
}

export async function getDashboardStats() {
  try {
    const [
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      revenueResult,
      totalClients,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.client.count(),
    ])
    
    return {
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      totalClients,
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    throw new Error('Failed to fetch dashboard stats')
  }
}

export async function getProductionMetrics(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        },
        productionUpdates: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    const totalItems = order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
    const producedItems = order.orderItems.reduce((sum, item) => sum + item.producedQty, 0)
    
    const daysInProduction = Math.ceil(
      (new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    const avgDailyProduction = daysInProduction > 0 ? producedItems / daysInProduction : 0
    const efficiency = totalItems > 0 ? (producedItems / totalItems) * 100 : 0
    const remainingItems = totalItems - producedItems
    const estimatedCompletion = avgDailyProduction > 0 ? Math.ceil(remainingItems / avgDailyProduction) : 0

    // Generate daily production data
    const dailyProduction: { date: string; produced: number }[] = []
    const productionByDate = new Map<string, number>()
    
    order.productionUpdates.forEach(update => {
      const date = format(new Date(update.createdAt), 'MM/dd')
      const itemsProduced = Object.values(update.itemsProduced as Record<string, number>)
        .reduce((sum, qty) => sum + qty, 0)
      
      productionByDate.set(date, (productionByDate.get(date) || 0) + itemsProduced)
    })

    for (let i = daysInProduction - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'MM/dd')
      dailyProduction.push({
        date,
        produced: productionByDate.get(date) || 0
      })
    }

    // Generate cumulative progress
    const cumulativeProgress: { date: string; total: number }[] = []
    let cumulative = 0
    
    dailyProduction.forEach(day => {
      cumulative += day.produced
      cumulativeProgress.push({
        date: day.date,
        total: cumulative
      })
    })

    // Item progress
    const itemProgress = order.orderItems.map(item => ({
      item: `${item.variant.product.name} (${item.variant.size} ${item.variant.color})`,
      produced: item.producedQty,
      remaining: item.quantity - item.producedQty
    }))

    // Velocity trend
    const velocityTrend = dailyProduction.map((day, index) => {
      const recentDays = dailyProduction.slice(Math.max(0, index - 2), index + 1)
      const avgVelocity = recentDays.reduce((sum, d) => sum + d.produced, 0) / recentDays.length
      
      return {
        date: day.date,
        velocity: avgVelocity
      }
    })

    return {
      daysInProduction,
      avgDailyProduction,
      efficiency,
      estimatedCompletion,
      dailyProduction,
      cumulativeProgress,
      itemProgress,
      velocityTrend
    }
  } catch (error) {
    console.error('Failed to fetch production metrics:', error)
    throw new Error('Failed to fetch production metrics')
  }
}