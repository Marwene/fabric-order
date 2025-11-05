'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database'

export async function getProducts() {
  try {
    return await prisma.product.findMany({
      include: {
        variants: true,
      },
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    throw new Error('Failed to fetch products')
  }
}

export async function getProductVariants() {
  try {
    return await prisma.productVariant.findMany({
      include: {
        product: true,
      },
      orderBy: [
        { product: { name: 'asc' } },
        { size: 'asc' },
        { color: 'asc' },
      ],
    })
  } catch (error) {
    console.error('Failed to fetch product variants:', error)
    throw new Error('Failed to fetch product variants')
  }
}

export async function getProduct(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            product: true,
            _count: {
              select: {
                orderItems: true
              }
            }
          },
          orderBy: [
            { size: 'asc' },
            { color: 'asc' }
          ]
        }
      }
    })
    
    if (!product) {
      throw new Error('Product not found')
    }
    
    return product
  } catch (error) {
    console.error('Failed to fetch product:', error)
    throw new Error('Failed to fetch product')
  }
}

export async function updateProduct(id: string, data: {
  name: string
  description?: string
  basePrice: number
  isActive: boolean
}) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data,
      include: { variants: true }
    })
    
    revalidatePath('/products')
    revalidatePath(`/products/${id}`)
    return { success: true, product }
  } catch (error) {
    console.error('Failed to update product:', error)
    return { success: false, error: 'Failed to update product' }
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id }
    })
    
    revalidatePath('/products')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete product:', error)
    throw new Error('Failed to delete product')
  }
}

export async function updateProductVariant(id: string, data: {
  priceAdjust?: number
  stockQty?: number
}) {
  try {
    const variant = await prisma.productVariant.update({
      where: { id },
      data,
      include: { product: true }
    })
    
    revalidatePath('/products')
    return { success: true, variant }
  } catch (error) {
    console.error('Failed to update product variant:', error)
    return { success: false, error: 'Failed to update product variant' }
  }
}

export async function deleteProductVariant(id: string) {
  try {
    await prisma.productVariant.delete({
      where: { id }
    })
    
    revalidatePath('/products')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete product variant:', error)
    return { success: false, error: 'Failed to delete product variant' }
  }
}

export async function getProductOrderHistory(productId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            variant: {
              productId
            }
          }
        }
      },
      include: {
        client: true,
        orderItems: {
          where: {
            variant: {
              productId
            }
          },
          include: {
            variant: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return orders.map(order => ({
      ...order,
      totalQuantity: order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
    }))
  } catch (error) {
    console.error('Failed to fetch product order history:', error)
    throw new Error('Failed to fetch product order history')
  }
}

export async function createProduct(data: {
  name: string
  description?: string
  category: string
  basePrice: number
}) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category as any,
        basePrice: data.basePrice,
      },
    })
    
    revalidatePath('/products')
    return { success: true, product }
  } catch (error) {
    console.error('Failed to create product:', error)
    return { success: false, error: 'Failed to create product' }
  }
}

export async function createProductVariant(data: {
  productId: string
  size: string
  color: string
  fabricType: string
  priceAdjust?: number
  stockQty?: number
}) {
  try {
    // Generate SKU
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    })
    
    if (!product) {
      return { success: false, error: 'Product not found' }
    }
    
    const sku = `${product.name.substring(0, 3).toUpperCase()}-${data.size}-${data.color.substring(0, 3).toUpperCase()}-${data.fabricType.substring(0, 3).toUpperCase()}`
    
    const variant = await prisma.productVariant.create({
      data: {
        productId: data.productId,
        size: data.size as any,
        color: data.color,
        fabricType: data.fabricType as any,
        priceAdjust: data.priceAdjust || 0,
        stockQty: data.stockQty || 0,
        sku,
      },
    })
    
    revalidatePath('/products')
    return { success: true, variant }
  } catch (error) {
    console.error('Failed to create product variant:', error)
    return { success: false, error: 'Failed to create product variant' }
  }
}