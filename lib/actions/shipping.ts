'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/database'
import { generateShippingLabel, generateQRCode } from '@/lib/utils/label-generator'

const PackageSchema = z.object({
  orderId: z.string().min(1),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
})

export async function createPackage(data: { orderId: string; weight?: number; dimensions?: string }) {
  try {
    const validatedData = PackageSchema.parse(data)
    
    // Get current package count for this order
    const packageCount = await prisma.package.count({
      where: { orderId: validatedData.orderId },
    })
    
    const package_ = await prisma.package.create({
      data: {
        orderId: validatedData.orderId,
        packageNumber: packageCount + 1,
        weight: validatedData.weight,
        dimensions: validatedData.dimensions,
      },
      include: {
        order: {
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
        },
      },
    })
    
    revalidatePath('/shipping')
    revalidatePath(`/orders/${validatedData.orderId}`)
    return { success: true, package: package_ }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    
    console.error('Failed to create package:', error)
    return { success: false, error: 'Failed to create package' }
  }
}

export async function generateLabel(packageId: string) {
  try {
    const package_ = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        order: {
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
        },
        packageItems: {
          include: {
            orderItem: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
          },
        },
      },
    })
    
    if (!package_) {
      return { success: false, error: 'Package not found' }
    }

    if (package_.packageItems.length === 0) {
      return { success: false, error: 'Package has no items assigned. Please assign items to the package before generating a label.' }
    }

    // Get total packages for this order
    const totalPackages = await prisma.package.count({
      where: { orderId: package_.orderId },
    })

    // Generate QR code with detailed package information
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const items = package_.packageItems.map(packageItem => ({
      productName: packageItem.orderItem.variant.product.name,
      variant: `${packageItem.orderItem.variant.size} ${packageItem.orderItem.variant.color} ${packageItem.orderItem.variant.fabricType}`,
      quantity: packageItem.quantity,
    }))
    const packageDetails = {
      orderNumber: package_.order.orderNumber,
      packageNumber: package_.packageNumber,
      totalPackages,
      client: package_.order.client.name,
      items,
      weight: package_.weight,
      dimensions: package_.dimensions,
      timestamp: new Date().toISOString()
    }
    const qrCodeData = JSON.stringify(packageDetails)
    const qrCode = qrCodeData // Store the JSON string

    // Prepare label data
    const labelData = {
      orderId: package_.order.id,
      orderNumber: package_.order.orderNumber,
      clientName: package_.order.client.name,
      clientAddress: {
        address: package_.order.client.address || '',
        city: package_.order.client.city || '',
        state: package_.order.client.state || '',
        zipCode: package_.order.client.zipCode || '',
        country: package_.order.client.country || 'US',
      },
      packageNumber: package_.packageNumber,
      totalPackages,
      items: package_.packageItems.map(packageItem => ({
          productName: packageItem.orderItem.variant.product.name,
          variant: `${packageItem.orderItem.variant.size} ${packageItem.orderItem.variant.color} ${packageItem.orderItem.variant.fabricType}`,
          quantity: packageItem.quantity,
        })),
      qrCode: qrCodeData, // Store the URL string, not the data URL
      weight: package_.weight,
      dimensions: package_.dimensions,
    }
    
    // Create or update shipping label
    const shippingLabel = await prisma.shippingLabel.upsert({
      where: { packageId },
      update: {
        labelData,
        qrCode: qrCodeData,
      },
      create: {
        packageId,
        labelData,
        qrCode,
      },
    })
    
    revalidatePath('/shipping')
    return { success: true, labelData, shippingLabel }
  } catch (error) {
    console.error('Failed to generate label:', error)
    return { success: false, error: 'Failed to generate label' }
  }
}

export async function markLabelPrinted(labelId: string) {
  try {
    const label = await prisma.shippingLabel.update({
      where: { id: labelId },
      data: { printedAt: new Date() },
    })
    
    revalidatePath('/shipping')
    return { success: true, label }
  } catch (error) {
    console.error('Failed to mark label as printed:', error)
    return { success: false, error: 'Failed to mark label as printed' }
  }
}

export async function getShippingPackages() {
  try {
    return await prisma.package.findMany({
      include: {
        order: {
          include: { client: true },
        },
        shippingLabels: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Failed to fetch shipping packages:', error)
    throw new Error('Failed to fetch shipping packages')
  }
}

export async function analyzeOrderForPackaging(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    })

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    // Group items by size and color combination
    const itemGroups: { [key: string]: any[] } = {}

    order.orderItems.forEach(item => {
      const key = `${item.variant.size}-${item.variant.color}`
      if (!itemGroups[key]) {
        itemGroups[key] = []
      }
      itemGroups[key].push(item)
    })

    // Create suggested packages (one per unique size/color combination)
    const suggestedPackages = Object.entries(itemGroups).map(([variantKey, items], index) => ({
      packageNumber: index + 1,
      items: items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        productName: item.variant.product.name,
        variant: `${item.variant.size} ${item.variant.color} ${item.variant.fabricType}`,
        variantId: item.variantId,
      })),
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    }))

    return {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
      suggestedPackages,
      totalPackages: suggestedPackages.length,
    }
  } catch (error) {
    console.error('Failed to analyze order for packaging:', error)
    return { success: false, error: 'Failed to analyze order' }
  }
}

// Create default packages based on size/color grouping
export async function createDefaultPackagesForOrder(orderId: string) {
  try {
    // First analyze the order to get suggested packages
    const analysis = await analyzeOrderForPackaging(orderId)
    if (!analysis.success || !analysis.suggestedPackages) {
      return analysis
    }

    // Create package configurations from the suggested packages
    const packageConfigurations = analysis.suggestedPackages.map(pkg => ({
      items: pkg.items.map(item => ({
        id: item.id,
        quantity: item.quantity
      })),
      weight: undefined,
      dimensions: undefined
    }))

    // Create the packages
    const result = await createPackagesFromAnalysis(orderId, packageConfigurations)
    return result
  } catch (error) {
    console.error('Failed to create default packages:', error)
    return { success: false, error: 'Failed to create default packages' }
  }
}

export async function createPackagesFromAnalysis(orderId: string, packageConfigurations: Array<{
  items: Array<{ id: string; quantity: number }>
  weight?: number
  dimensions?: string
}>) {
  try {
    const packages = []

    for (let i = 0; i < packageConfigurations.length; i++) {
      const config = packageConfigurations[i]

      const package_ = await prisma.package.create({
        data: {
          orderId,
          packageNumber: i + 1,
          weight: config.weight,
          dimensions: config.dimensions,
        },
        include: {
          order: {
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
          },
        },
      })

      // Create PackageItem associations
      for (const item of config.items) {
        await prisma.packageItem.create({
          data: {
            packageId: package_.id,
            orderItemId: item.id,
            quantity: item.quantity,
          },
        })
      }

      packages.push(package_)
    }

    revalidatePath('/shipping')
    revalidatePath(`/orders/${orderId}`)

    return { success: true, packages }
  } catch (error) {
    console.error('Failed to create packages from analysis:', error)
    return { success: false, error: 'Failed to create packages' }
  }
}

export async function assignItemsToPackage(packageId: string, itemAssignments: Array<{ orderItemId: string; quantity: number }>) {
  try {
    // Validate that all items belong to the same order as the package
    const package_ = await prisma.package.findUnique({
      where: { id: packageId },
      include: { order: { include: { orderItems: true } } },
    })

    if (!package_) {
      return { success: false, error: 'Package not found' }
    }

    // Check that all assigned items belong to the order and quantities are valid
    for (const assignment of itemAssignments) {
      const orderItem = package_.order.orderItems.find(item => item.id === assignment.orderItemId)
      if (!orderItem) {
        return { success: false, error: `Item ${assignment.orderItemId} does not belong to this order` }
      }
      if (assignment.quantity > orderItem.quantity) {
        return { success: false, error: `Quantity ${assignment.quantity} exceeds available quantity ${orderItem.quantity} for item ${assignment.orderItemId}` }
      }
      // Check if item is already assigned to another package
      const existingAssignment = await prisma.packageItem.findFirst({
        where: { orderItemId: assignment.orderItemId },
      })
      if (existingAssignment && existingAssignment.packageId !== packageId) {
        return { success: false, error: `Item ${assignment.orderItemId} is already assigned to another package` }
      }
    }

    // Delete existing assignments for this package
    await prisma.packageItem.deleteMany({
      where: { packageId },
    })

    // Create new assignments
    for (const assignment of itemAssignments) {
      await prisma.packageItem.create({
        data: {
          packageId,
          orderItemId: assignment.orderItemId,
          quantity: assignment.quantity,
        },
      })
    }

    revalidatePath('/shipping')
    return { success: true }
  } catch (error) {
    console.error('Failed to assign items to package:', error)
    return { success: false, error: 'Failed to assign items to package' }
  }
}