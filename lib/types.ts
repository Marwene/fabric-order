import { Prisma } from '@/lib/generated/prisma/client'

// Client types
export type ClientWithOrders = Prisma.ClientGetPayload<{
  include: { orders: true }
}>

// Order types
export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    client: true
    orderItems: {
      include: {
        variant: {
          include: { product: true }
        }
      }
    }
    packages: {
      include: { shippingLabels: true }
    }
    productionUpdates: true
  }
}>

export type OrderItemWithDetails = Prisma.OrderItemGetPayload<{
  include: {
    variant: {
      include: { product: true }
    }
  }
}>

// Product types
export type ProductWithVariants = Prisma.ProductGetPayload<{
  include: { variants: true }
}>

export type ProductVariantWithProduct = Prisma.ProductVariantGetPayload<{
  include: { product: true }
}>

// Package types
export type PackageWithDetails = Prisma.PackageGetPayload<{
  include: {
    order: {
      include: { client: true }
    }
    shippingLabels: true
  }
}>

// Form types
export interface ClientFormData {
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  notes?: string
}

export interface OrderFormData {
  clientId: string
  dueDate?: Date
  notes?: string
  items: {
    variantId: string
    quantity: number
    unitPrice: number
  }[]
}

export interface ProductionUpdateFormData {
  orderId: string
  itemsProduced: Record<string, number>
  notes?: string
}

// Dashboard types
export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  inProgressOrders: number
  completedOrders: number
  totalRevenue: number
  totalClients: number
}

// Printer types
export interface PrinterConfig {
  name: string
  port: string
  isConnected: boolean
}

export interface LabelData {
  orderId: string
  orderNumber: string
  clientName: string
  clientAddress: {
    address: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  packageNumber: number
  totalPackages: number
  items: {
    productName: string
    variant: string
    quantity: number
  }[]
  qrCode: string
  weight?: number
  dimensions?: string
}