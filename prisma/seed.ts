import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create sample clients
  const client1 = await prisma.client.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      company: 'Smith Enterprises',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    },
  })

  const client2 = await prisma.client.upsert({
    where: { email: 'sarah@techcorp.com' },
    update: {},
    create: {
      name: 'Sarah Johnson',
      email: 'sarah@techcorp.com',
      phone: '(555) 987-6543',
      company: 'TechCorp Inc',
      address: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'US',
    },
  })

  // Create sample products
  const tshirtProduct = await prisma.product.upsert({
    where: { id: 'tshirt-basic' },
    update: {},
    create: {
      id: 'tshirt-basic',
      name: 'Basic T-Shirt',
      description: 'Comfortable cotton t-shirt for everyday wear',
      category: 'TSHIRT',
      basePrice: 15.99,
    },
  })

  const poloProduct = await prisma.product.upsert({
    where: { id: 'polo-classic' },
    update: {},
    create: {
      id: 'polo-classic',
      name: 'Classic Polo',
      description: 'Professional polo shirt with collar',
      category: 'POLO',
      basePrice: 24.99,
    },
  })

  // Create product variants
  const variants = [
    { product: tshirtProduct, size: 'S', color: 'Black', fabric: 'COTTON', sku: 'TSH-S-BLK-COT' },
    { product: tshirtProduct, size: 'M', color: 'Black', fabric: 'COTTON', sku: 'TSH-M-BLK-COT' },
    { product: tshirtProduct, size: 'L', color: 'Black', fabric: 'COTTON', sku: 'TSH-L-BLK-COT' },
    { product: tshirtProduct, size: 'S', color: 'White', fabric: 'COTTON', sku: 'TSH-S-WHT-COT' },
    { product: tshirtProduct, size: 'M', color: 'White', fabric: 'COTTON', sku: 'TSH-M-WHT-COT' },
    { product: tshirtProduct, size: 'L', color: 'White', fabric: 'COTTON', sku: 'TSH-L-WHT-COT' },
    { product: poloProduct, size: 'S', color: 'Navy', fabric: 'COTTON_BLEND', sku: 'POL-S-NAV-COB' },
    { product: poloProduct, size: 'M', color: 'Navy', fabric: 'COTTON_BLEND', sku: 'POL-M-NAV-COB' },
    { product: poloProduct, size: 'L', color: 'Navy', fabric: 'COTTON_BLEND', sku: 'POL-L-NAV-COB' },
    { product: poloProduct, size: 'S', color: 'White', fabric: 'COTTON_BLEND', sku: 'POL-S-WHT-COB' },
  ]

  for (const variant of variants) {
    await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      update: {},
      create: {
        productId: variant.product.id,
        size: variant.size as any,
        color: variant.color,
        fabricType: variant.fabric as any,
        sku: variant.sku,
        stockQty: 100,
      },
    })
  }

  // Create sample orders
  const order1 = await prisma.order.create({
    data: {
      clientId: client1.id,
      orderNumber: 'ORD-000001',
      status: 'IN_PROGRESS',
      totalAmount: 159.90,
      dueDate: new Date('2025-02-15'),
      notes: 'Rush order for company event',
      orderItems: {
        create: [
          {
            variantId: (await prisma.productVariant.findUnique({ where: { sku: 'TSH-M-BLK-COT' } }))!.id,
            quantity: 5,
            unitPrice: 15.99,
            totalPrice: 79.95,
            producedQty: 3,
          },
          {
            variantId: (await prisma.productVariant.findUnique({ where: { sku: 'TSH-L-BLK-COT' } }))!.id,
            quantity: 5,
            unitPrice: 15.99,
            totalPrice: 79.95,
            producedQty: 2,
          },
        ],
      },
    },
  })

  const order2 = await prisma.order.create({
    data: {
      clientId: client2.id,
      orderNumber: 'ORD-000002',
      status: 'COMPLETED',
      totalAmount: 249.90,
      dueDate: new Date('2025-02-20'),
      orderItems: {
        create: [
          {
            variantId: (await prisma.productVariant.findUnique({ where: { sku: 'POL-M-NAV-COB' } }))!.id,
            quantity: 10,
            unitPrice: 24.99,
            totalPrice: 249.90,
            producedQty: 10,
          },
        ],
      },
    },
  })

  // Create production updates
  await prisma.productionUpdate.create({
    data: {
      orderId: order1.id,
      itemsProduced: {
        [(await prisma.productVariant.findUnique({ where: { sku: 'TSH-M-BLK-COT' } }))!.id]: 3,
        [(await prisma.productVariant.findUnique({ where: { sku: 'TSH-L-BLK-COT' } }))!.id]: 2,
      },
      notes: 'Good progress on first batch',
      createdBy: 'system',
      date: new Date(),
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })