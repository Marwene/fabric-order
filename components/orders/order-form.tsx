'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import { getClients } from '@/lib/actions/clients'
import { getProductVariants } from '@/lib/actions/products'
import { createOrder } from '@/lib/actions/orders'
import type { OrderFormData } from '@/lib/types'

const orderItemSchema = z.object({
  variantId: z.string().min(1, 'Product variant is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
})

const orderSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
})

type OrderFormValues = z.infer<typeof orderSchema>

export function OrderForm({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientId: '',
      dueDate: '',
      notes: '',
      items: [{ variantId: '', quantity: 1, unitPrice: 0 }],
    },
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants'],
    queryFn: getProductVariants,
  })

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Order created successfully')
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.error || 'Failed to create order')
      }
    },
    onError: () => {
      toast.error('Failed to create order')
    },
  })

  const onSubmit = (data: OrderFormValues) => {
    const formData: OrderFormData = {
      clientId: data.clientId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes,
      items: data.items,
    }
    createOrderMutation.mutate(formData)
  }

  const addItem = () => {
    const currentItems = form.getValues('items')
    form.setValue('items', [...currentItems, { variantId: '', quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items')
    if (currentItems.length > 1) {
      form.setValue('items', currentItems.filter((_, i) => i !== index))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Add a new order for a client with product items.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Order Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {form.watch('items').map((_, index) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`items.${index}.variantId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Variant</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select variant" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {variants.map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {variant.product.name} - {variant.size} {variant.color} ({variant.fabricType})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="w-24">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qty</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="w-32">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={form.watch('items').length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}