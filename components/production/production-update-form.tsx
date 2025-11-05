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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addProductionUpdate } from '@/lib/actions/production'
import type { ProductionUpdateFormData, OrderWithDetails } from '@/lib/types'

const productionUpdateSchema = z.object({
  notes: z.string().optional(),
  items: z.record(z.string(), z.number().min(0)),
})

type ProductionUpdateFormValues = z.infer<typeof productionUpdateSchema>

interface ProductionUpdateFormProps {
  order: OrderWithDetails
  children: React.ReactNode
}

export function ProductionUpdateForm({ order, children }: ProductionUpdateFormProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<ProductionUpdateFormValues>({
    resolver: zodResolver(productionUpdateSchema),
    defaultValues: {
      notes: '',
      items: order.orderItems.reduce((acc, item) => {
        acc[item.variantId] = 0
        return acc
      }, {} as Record<string, number>),
    },
  })

  const updateProductionMutation = useMutation({
    mutationFn: addProductionUpdate,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Production update added successfully')
        queryClient.invalidateQueries({ queryKey: ['production-orders'] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.error || 'Failed to add production update')
      }
    },
    onError: () => {
      toast.error('Failed to add production update')
    },
  })

  const onSubmit = (data: ProductionUpdateFormValues) => {
    const formData: ProductionUpdateFormData = {
      orderId: order.id,
      itemsProduced: data.items,
      notes: data.notes,
    }
    updateProductionMutation.mutate(formData)
  }

  const getTotalProduced = () => {
    return Object.values(form.watch('items')).reduce((sum, qty) => sum + qty, 0)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Production Progress</DialogTitle>
          <DialogDescription>
            Record the quantity produced for each item in order {order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Client:</span> {order.client.name}
                </div>
                <div>
                  <span className="font-medium">Order:</span> {order.orderNumber}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {order.status.replace('_', ' ')}
                </div>
                <div>
                  <span className="font-medium">Due Date:</span>{' '}
                  {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'No due date'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Production Quantities</h3>
              
              <div className="space-y-4">
                {order.orderItems.map((item) => {
                  const remaining = item.quantity - item.producedQty
                  return (
                    <Card key={item.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">
                              {item.variant.product.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {item.variant.size} {item.variant.color} ({item.variant.fabricType})
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <div>Ordered: {item.quantity}</div>
                            <div>Produced: {item.producedQty}</div>
                            <div className="font-medium">Remaining: {remaining}</div>
                          </div>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`items.${item.variantId}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity Produced Today</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max={remaining}
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm font-medium">
                  Total items to be produced today: {getTotalProduced()}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Production Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any notes about today's production..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProductionMutation.isPending || getTotalProduced() === 0}
              >
                {updateProductionMutation.isPending ? 'Updating...' : 'Update Production'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}