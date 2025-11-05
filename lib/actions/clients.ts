'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/database'
import type { ClientFormData } from '@/lib/types'

const ClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
})

export async function createClient(data: ClientFormData) {
  try {
    const validatedData = ClientSchema.parse(data)
    
    const client = await prisma.client.create({
      data: {
        ...validatedData,
        country: validatedData.country || 'US',
      },
    })
    
    revalidatePath('/clients')
    return { success: true, client }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return { success: false, error: 'Email already exists' }
      }
    }
    
    console.error('Failed to create client:', error)
    return { success: false, error: 'Failed to create client' }
  }
}

export async function updateClient(id: string, data: ClientFormData) {
  try {
    const validatedData = ClientSchema.parse(data)
    
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...validatedData,
        country: validatedData.country || 'US',
      },
    })
    
    revalidatePath('/clients')
    revalidatePath(`/clients/${id}`)
    return { success: true, client }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    
    console.error('Failed to update client:', error)
    return { success: false, error: 'Failed to update client' }
  }
}

export async function deleteClient(id: string) {
  try {
    await prisma.client.delete({
      where: { id },
    })
    
    revalidatePath('/clients')
    redirect('/clients')
  } catch (error) {
    console.error('Failed to delete client:', error)
    throw new Error('Failed to delete client')
  }
}

export async function getClients() {
  try {
    return await prisma.client.findMany({
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    throw new Error('Failed to fetch clients')
  }
}

export async function getClient(id: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            orderItems: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    
    if (!client) {
      throw new Error('Client not found')
    }
    
    return client
  } catch (error) {
    console.error('Failed to fetch client:', error)
    throw new Error('Failed to fetch client')
  }
}