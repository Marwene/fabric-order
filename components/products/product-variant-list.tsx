'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { updateProductVariant, deleteProductVariant } from '@/lib/actions/products'
import { CreditCard as Edit, Trash2, Package } from 'lucide-react'
import type { ProductVariantWithProduct } from '@/lib/types'

interface ProductVariantListProps {
  variants: ProductVariantWithProduct[]
}

export function ProductVariantList({ variants }: ProductVariantListProps) {
  if (variants.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No variants created</h3>
          <p className="text-muted-foreground">
            Create your first product variant to start managing inventory.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {variants.map((variant) => (
        <VariantCard key={variant.id} variant={variant} />
      ))}
    </div>
  )
}

function VariantCard({ variant }: { variant: ProductVariantWithProduct }) {
  const queryClient = useQueryClient()

  const deleteVariantMutation = useMutation({
    mutationFn: () => deleteProductVariant(variant.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Variant deleted successfully')
        queryClient.invalidateQueries({ queryKey: ['product', variant.productId] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
      } else {
        toast.error(result.error || 'Failed to delete variant')
      }
    },
  })

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    if (stock < 10) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' }
  }

  const stockStatus = getStockStatus(variant.stockQty)
  const finalPrice = variant.product.basePrice + variant.priceAdjust

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {variant.size} {variant.color}
          </CardTitle>
          <div className="flex items-center gap-1">
            <VariantEditDialog variant={variant}>
              <Button variant="ghost" size="sm">
                <Edit className="h-3 w-3" />
              </Button>
            </VariantEditDialog>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => deleteVariantMutation.mutate()}
              disabled={deleteVariantMutation.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Fabric</span>
          <span className="text-sm font-medium">{variant.fabricType.replace('_', ' ')}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Price</span>
          <span className="text-sm font-medium">${finalPrice.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Stock</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{variant.stockQty}</span>
            <Badge className={stockStatus.color}>
              {stockStatus.label}
            </Badge>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            SKU: {variant.sku}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function VariantEditDialog({ variant, children }: { variant: ProductVariantWithProduct, children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    priceAdjust: variant.priceAdjust,
    stockQty: variant.stockQty,
  })
  const queryClient = useQueryClient()

  const updateVariantMutation = useMutation({
    mutationFn: (data: any) => updateProductVariant(variant.id, data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Variant updated successfully')
        queryClient.invalidateQueries({ queryKey: ['product', variant.productId] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        setOpen(false)
      } else {
        toast.error(result.error || 'Failed to update variant')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateVariantMutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Variant</DialogTitle>
          <DialogDescription>
            Update pricing and stock for {variant.size} {variant.color}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="priceAdjust">Price Adjustment ($)</Label>
            <Input
              id="priceAdjust"
              type="number"
              step="0.01"
              value={formData.priceAdjust}
              onChange={(e) => setFormData({ ...formData, priceAdjust: parseFloat(e.target.value) || 0 })}
            />
            <div className="text-xs text-muted-foreground mt-1">
              Final price: ${(variant.product.basePrice + formData.priceAdjust).toFixed(2)}
            </div>
          </div>
          
          <div>
            <Label htmlFor="stockQty">Stock Quantity</Label>
            <Input
              id="stockQty"
              type="number"
              value={formData.stockQty}
              onChange={(e) => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateVariantMutation.isPending}>
              {updateVariantMutation.isPending ? 'Updating...' : 'Update Variant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}