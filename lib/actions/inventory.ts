'use server'

import { prisma } from '@/lib/database'

export async function getInventoryStatus() {
  try {
    const variants = await prisma.productVariant.findMany({
      include: {
        product: true,
        orderItems: {
          where: {
            order: {
              status: {
                in: ['PENDING', 'IN_PROGRESS']
              }
            }
          },
          select: {
            quantity: true,
            producedQty: true
          }
        }
      },
      orderBy: [
        { product: { name: 'asc' } },
        { size: 'asc' },
        { color: 'asc' }
      ]
    })

    const inventoryData = variants.map(variant => {
      // Calculate reserved quantity (ordered but not yet produced)
      const reservedQty = variant.orderItems.reduce((sum, item) => {
        return sum + (item.quantity - item.producedQty)
      }, 0)

      // Set reorder point (this would be configurable per variant in a real system)
      const reorderPoint = Math.max(10, Math.floor(variant.stockQty * 0.2))

      return {
        id: variant.id,
        sku: variant.sku,
        product: {
          name: variant.product.name,
          category: variant.product.category
        },
        size: variant.size,
        color: variant.color,
        fabricType: variant.fabricType,
        stockQty: variant.stockQty,
        reservedQty,
        reorderPoint
      }
    })

    const totalVariants = inventoryData.length
    const totalStock = inventoryData.reduce((sum, item) => sum + item.stockQty, 0)
    const reservedStock = inventoryData.reduce((sum, item) => sum + item.reservedQty, 0)

    return {
      variants: inventoryData,
      totalVariants,
      totalStock,
      reservedStock
    }
  } catch (error) {
    console.error('Failed to fetch inventory status:', error)
    throw new Error('Failed to fetch inventory status')
  }
}

export async function updateInventory(variantId: string, newStockQty: number) {
  try {
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQty: newStockQty },
      include: { product: true }
    })

    return { success: true, variant }
  } catch (error) {
    console.error('Failed to update inventory:', error)
    return { success: false, error: 'Failed to update inventory' }
  }
}

export async function adjustInventory(variantId: string, adjustment: number, reason: string) {
  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId }
    })

    if (!variant) {
      return { success: false, error: 'Variant not found' }
    }

    const newStockQty = Math.max(0, variant.stockQty + adjustment)

    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQty: newStockQty },
      include: { product: true }
    })

    // In a real system, you'd also log this adjustment
    console.log(`Inventory adjustment: ${variant.sku} ${adjustment > 0 ? '+' : ''}${adjustment} (${reason})`)

    return { success: true, variant: updatedVariant }
  } catch (error) {
    console.error('Failed to adjust inventory:', error)
    return { success: false, error: 'Failed to adjust inventory' }
  }
}

export async function getInventoryMovements(variantId?: string, days: number = 30) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get production updates that affected inventory
    const productionUpdates = await prisma.productionUpdate.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                variant: {
                  include: { product: true }
                }
              },
              where: variantId ? { variantId } : undefined
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const movements = []

    for (const update of productionUpdates) {
      const itemsProduced = update.itemsProduced as Record<string, number>
      
      for (const [itemVariantId, quantity] of Object.entries(itemsProduced)) {
        if (variantId && itemVariantId !== variantId) continue
        if (quantity <= 0) continue

        const orderItem = update.order.orderItems.find(item => item.variantId === itemVariantId)
        if (!orderItem) continue

        movements.push({
          id: `${update.id}-${itemVariantId}`,
          date: update.createdAt,
          type: 'production',
          variantId: itemVariantId,
          variant: orderItem.variant,
          quantity: quantity,
          reference: update.order.orderNumber,
          notes: update.notes
        })
      }
    }

    return movements
  } catch (error) {
    console.error('Failed to fetch inventory movements:', error)
    throw new Error('Failed to fetch inventory movements')
  }
}