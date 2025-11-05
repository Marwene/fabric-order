'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { createPackage, assignItemsToPackage } from '@/lib/actions/shipping'

const packageSchema = z.object({
  orderId: z.string().min(1, 'Order is required'),
  weight: z.number().positive('Weight must be positive').optional(),
  dimensions: z.string().optional(),
})

type PackageFormValues = z.infer<typeof packageSchema>

interface PackageFormProps {
  orders: Array<{ id: string; orderNumber: string; client: { name: string } }>
  children: React.ReactNode
}

export function PackageForm({ orders, children }: PackageFormProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      orderId: '',
      weight: undefined,
      dimensions: '',
    },
  })

  const createPackageMutation = useMutation({
    mutationFn: createPackage,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Package created successfully')
        queryClient.invalidateQueries({ queryKey: ['shipping-packages'] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.error || 'Failed to create package')
      }
    },
    onError: () => {
      toast.error('Failed to create package')
    },
  })

  const onSubmit = (data: PackageFormValues) => {
    createPackageMutation.mutate({
      orderId: data.orderId,
      weight: data.weight,
      dimensions: data.dimensions,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Package</DialogTitle>
          <DialogDescription>
            Create a new package for shipping from a completed order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="orderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select order" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.orderNumber} - {order.client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (lbs)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="2.5"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensions (L x W x H)</FormLabel>
                  <FormControl>
                    <Input placeholder="12 x 8 x 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPackageMutation.isPending}>
                {createPackageMutation.isPending ? 'Creating...' : 'Create Package'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}