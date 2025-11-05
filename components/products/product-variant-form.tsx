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
import { createProductVariant } from '@/lib/actions/products'

const variantSchema = z.object({
  size: z.string().min(1, 'Size is required'),
  color: z.string().min(1, 'Color is required'),
  fabricType: z.string().min(1, 'Fabric type is required'),
  priceAdjust: z.number(),
  stockQty: z.number().min(0, 'Stock quantity must be positive'),
})

type VariantFormValues = z.infer<typeof variantSchema>

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const FABRIC_TYPES = [
  { value: 'COTTON', label: 'Cotton' },
  { value: 'POLYESTER', label: 'Polyester' },
  { value: 'COTTON_BLEND', label: 'Cotton Blend' },
  { value: 'POLY_BLEND', label: 'Poly Blend' },
]

const COMMON_COLORS = [
  'Black', 'White', 'Navy', 'Gray', 'Red', 'Blue', 'Green', 'Yellow',
  'Orange', 'Purple', 'Pink', 'Brown', 'Beige', 'Maroon', 'Teal'
]

interface ProductVariantFormProps {
  productId: string
  children: React.ReactNode
}

export function ProductVariantForm({ productId, children }: ProductVariantFormProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      size: '',
      color: '',
      fabricType: '',
      priceAdjust: 0,
      stockQty: 0,
    },
  })

  const createVariantMutation = useMutation({
    mutationFn: createProductVariant,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Product variant created successfully')
        queryClient.invalidateQueries({ queryKey: ['product', productId] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['product-variants'] })
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.error || 'Failed to create product variant')
      }
    },
    onError: () => {
      toast.error('Failed to create product variant')
    },
  })

  const onSubmit = (data: VariantFormValues) => {
    createVariantMutation.mutate({
      productId,
      ...data,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product Variant</DialogTitle>
          <DialogDescription>
            Create a new size, color, and fabric combination for this product.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
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
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_COLORS.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fabricType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fabric Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fabric type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FABRIC_TYPES.map((fabric) => (
                        <SelectItem key={fabric.value} value={fabric.value}>
                          {fabric.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priceAdjust"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Adjustment ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stockQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createVariantMutation.isPending}>
                {createVariantMutation.isPending ? 'Creating...' : 'Create Variant'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}