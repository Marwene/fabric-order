'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/database'
import type { OrderFormData } from '@/lib/types'

const OrderItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
})

const OrderSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
})

export async function createOrder(data: OrderFormData) {
  try {
    const validatedData = OrderSchema.parse(data)
    
    // Generate order number
    const orderCount = await prisma.order.count()
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`
    
    // Calculate total amount
    const totalAmount = validatedData.items.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice),
      0
    )
    
    const order = await prisma.order.create({
      data: {
        clientId: validatedData.clientId,
        orderNumber,
        totalAmount,
        dueDate: validatedData.dueDate,
        notes: validatedData.notes,
        orderItems: {
          create: validatedData.items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
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
      },
    })
    
    revalidatePath('/orders')
    return { success: true, order }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    
    console.error('Failed to create order:', error)
    return { success: false, error: 'Failed to create order' }
  }
}

export async function updateOrderStatus(id: string, status: string) {
  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status: status as any },
    })
    
    revalidatePath('/orders')
    revalidatePath(`/orders/${id}`)
    return { success: true, order }
  } catch (error) {
    console.error('Failed to update order status:', error)
    return { success: false, error: 'Failed to update order status' }
  }
}

export async function deleteOrder(id: string) {
  try {
    await prisma.order.delete({
      where: { id },
    })
    
    revalidatePath('/orders')
    redirect('/orders')
  } catch (error) {
    console.error('Failed to delete order:', error)
    throw new Error('Failed to delete order')
  }
}

export async function getOrders() {
  try {
    return await prisma.order.findMany({
      include: {
        client: true,
        orderItems: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        packages: true,
        _count: {
          select: {
            orderItems: true,
            packages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    throw new Error('Failed to fetch orders')
  }
}

export async function getOrder(id: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
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
        },
      },
    })
    
    if (!order) {
      throw new Error('Order not found')
    }
    
    return order
  } catch (error) {
    console.error('Failed to fetch order:', error)
    throw new Error('Failed to fetch order')
  }
}