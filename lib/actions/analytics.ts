'use server'

import { prisma } from '@/lib/database'
import { subMonths, format, startOfMonth, endOfMonth, subDays } from 'date-fns'

export async function getDashboardAnalytics() {
  try {
    const [
      orderStatusDistribution,
      monthlyRevenue,
      topProducts,
      productionEfficiency
    ] = await Promise.all([
      getOrderStatusDistribution(),
      getMonthlyRevenue(),
      getTopProducts(),
      getProductionEfficiency()
    ])

    return {
      orderStatusDistribution,
      monthlyRevenue,
      topProducts,
      productionEfficiency
    }
  } catch (error) {
    console.error('Failed to fetch dashboard analytics:', error)
    throw new Error('Failed to fetch dashboard analytics')
  }
}

async function getOrderStatusDistribution() {
  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  })

  return statusCounts.map(item => ({
    name: item.status.replace('_', ' '),
    value: item._count.id
  }))
}

async function getMonthlyRevenue() {
  const months = []
  const currentDate = new Date()

  for (let i = 11; i >= 0; i--) {
    const date = subMonths(currentDate, i)
    const startDate = startOfMonth(date)
    const endDate = endOfMonth(date)

    const revenue = await prisma.order.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          not: 'CANCELLED'
        }
      }
    })

    months.push({
      month: format(date, 'MMM yyyy'),
      revenue: revenue._sum.totalAmount || 0
    })
  }

  return months
}

async function getTopProducts() {
  const topProducts = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _count: {
      id: true
    },
    _sum: {
      quantity: true
    },
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    },
    take: 10
  })

  const productsWithDetails = await Promise.all(
    topProducts.map(async (item) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true }
      })

      return {
        name: variant?.product.name || 'Unknown',
        orders: item._count.id,
        quantity: item._sum.quantity || 0
      }
    })
  )

  return productsWithDetails.slice(0, 5)
}

async function getProductionEfficiency() {
  const days = []
  const currentDate = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = subDays(currentDate, i)
    const startDate = new Date(date.setHours(0, 0, 0, 0))
    const endDate = new Date(date.setHours(23, 59, 59, 999))

    // Get production updates for this day
    const updates = await prisma.productionUpdate.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Calculate actual production
    let actualProduction = 0
    updates.forEach(update => {
      const itemsProduced = update.itemsProduced as Record<string, number>
      actualProduction += Object.values(itemsProduced).reduce((sum, qty) => sum + qty, 0)
    })

    // Estimate target (this would be configurable in a real system)
    const targetProduction = 100 // items per day

    days.push({
      date: format(date, 'MM/dd'),
      actual: actualProduction,
      target: targetProduction
    })
  }

  return days
}

export async function getClientAnalytics(clientId: string) {
  try {
    const [
      orderHistory,
      productPreferences,
      revenueContribution
    ] = await Promise.all([
      getClientOrderHistory(clientId),
      getClientProductPreferences(clientId),
      getClientRevenueContribution(clientId)
    ])

    return {
      orderHistory,
      productPreferences,
      revenueContribution
    }
  } catch (error) {
    console.error('Failed to fetch client analytics:', error)
    throw new Error('Failed to fetch client analytics')
  }
}

async function getClientOrderHistory(clientId: string) {
  const orders = await prisma.order.findMany({
    where: { clientId },
    select: {
      createdAt: true,
      totalAmount: true,
      status: true
    },
    orderBy: { createdAt: 'asc' }
  })

  return orders.map(order => ({
    date: format(new Date(order.createdAt), 'MMM yyyy'),
    amount: order.totalAmount,
    status: order.status
  }))
}

async function getClientProductPreferences(clientId: string) {
  const preferences = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _sum: {
      quantity: true
    },
    where: {
      order: {
        clientId
      }
    },
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    },
    take: 5
  })

  const preferencesWithDetails = await Promise.all(
    preferences.map(async (item) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true }
      })

      return {
        product: variant?.product.name || 'Unknown',
        variant: `${variant?.size} ${variant?.color}`,
        quantity: item._sum.quantity || 0
      }
    })
  )

  return preferencesWithDetails
}

async function getClientRevenueContribution(clientId: string) {
  const clientRevenue = await prisma.order.aggregate({
    _sum: {
      totalAmount: true
    },
    where: {
      clientId,
      status: {
        not: 'CANCELLED'
      }
    }
  })

  const totalRevenue = await prisma.order.aggregate({
    _sum: {
      totalAmount: true
    },
    where: {
      status: {
        not: 'CANCELLED'
      }
    }
  })

  const clientTotal = clientRevenue._sum.totalAmount || 0
  const overallTotal = totalRevenue._sum.totalAmount || 1

  return {
    clientRevenue: clientTotal,
    totalRevenue: overallTotal,
    percentage: (clientTotal / overallTotal) * 100
  }
}

export async function getProductAnalytics(productId: string) {
  try {
    const [
      orderStats,
      variantPerformance,
      salesTrend,
      sizeDistribution,
      colorPreferences
    ] = await Promise.all([
      getProductOrderStats(productId),
      getProductVariantPerformance(productId),
      getProductSalesTrend(productId),
      getProductSizeDistribution(productId),
      getProductColorPreferences(productId)
    ])

    return {
      ...orderStats,
      variantPerformance,
      salesTrend,
      sizeDistribution,
      colorPreferences
    }
  } catch (error) {
    console.error('Failed to fetch product analytics:', error)
    throw new Error('Failed to fetch product analytics')
  }
}

async function getProductOrderStats(productId: string) {
  const stats = await prisma.orderItem.aggregate({
    _count: { id: true },
    _sum: { 
      quantity: true,
      totalPrice: true 
    },
    where: {
      variant: { productId }
    }
  })

  const avgOrderValue = stats._count.id > 0 
    ? (stats._sum.totalPrice || 0) / stats._count.id 
    : 0

  return {
    totalOrders: stats._count.id,
    totalQuantity: stats._sum.quantity || 0,
    totalRevenue: stats._sum.totalPrice || 0,
    avgOrderValue
  }
}

async function getProductVariantPerformance(productId: string) {
  const variants = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _sum: { quantity: true },
    where: {
      variant: { productId }
    },
    orderBy: {
      _sum: { quantity: 'desc' }
    },
    take: 10
  })

  const variantDetails = await Promise.all(
    variants.map(async (item) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId }
      })
      return {
        variant: `${variant?.size} ${variant?.color}`,
        quantity: item._sum.quantity || 0
      }
    })
  )

  return variantDetails
}

async function getProductSalesTrend(productId: string) {
  const months = []
  const currentDate = new Date()

  for (let i = 11; i >= 0; i--) {
    const date = subMonths(currentDate, i)
    const startDate = startOfMonth(date)
    const endDate = endOfMonth(date)

    const sales = await prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        variant: { productId },
        order: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    })

    months.push({
      month: format(date, 'MMM yyyy'),
      quantity: sales._sum.quantity || 0
    })
  }

  return months
}

async function getProductSizeDistribution(productId: string) {
  const sizes = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _sum: { quantity: true },
    where: {
      variant: { productId }
    }
  })

  const sizeData = new Map()
  
  for (const item of sizes) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId }
    })
    
    if (variant) {
      const current = sizeData.get(variant.size) || 0
      sizeData.set(variant.size, current + (item._sum.quantity || 0))
    }
  }

  return Array.from(sizeData.entries()).map(([name, value]) => ({
    name,
    value
  }))
}

async function getProductColorPreferences(productId: string) {
  const colors = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _sum: { quantity: true },
    where: {
      variant: { productId }
    }
  })

  const colorData = new Map()
  
  for (const item of colors) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId }
    })
    
    if (variant) {
      const current = colorData.get(variant.color) || 0
      colorData.set(variant.color, current + (item._sum.quantity || 0))
    }
  }

  return Array.from(colorData.entries())
    .map(([color, quantity]) => ({ color, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8)
}