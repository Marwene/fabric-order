'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getProduct, updateProduct, deleteProduct, getProductOrderHistory } from '@/lib/actions/products'
import { ProductVariantForm } from '@/components/products/product-variant-form'
import { ProductVariantList } from '@/components/products/product-variant-list'
import { ProductAnalytics } from '@/components/products/product-analytics'
import { formatDistance } from 'date-fns'
import { ArrowLeft, Package, CreditCard as Edit, Trash2, Plus, TrendingUp, ChartBar as BarChart3, Palette } from 'lucide-react'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const productId = params.id as string
  const [isEditing, setIsEditing] = useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ data }: { data: any }) => updateProduct(productId, data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Product updated successfully')
        queryClient.invalidateQueries({ queryKey: ['product', productId] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        setIsEditing(false)
      } else {
        toast.error(result.error || 'Failed to update product')
      }
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: () => deleteProduct(productId),
    onSuccess: () => {
      toast.success('Product deleted successfully')
      router.push('/products')
    },
    onError: () => {
      toast.error('Failed to delete product')
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The product you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push('/products')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'TSHIRT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'POLO':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'BLOUSE':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const totalVariants = product.variants.length
  const activeVariants = product.variants.filter(v => v.stockQty > 0).length
  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQty, 0)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.push('/products')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Products
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
                  <p className="text-muted-foreground">
                    Product details and variant management
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => deleteProductMutation.mutate()}
                  disabled={deleteProductMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Product Information */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isEditing ? (
                    <ProductEditForm 
                      product={product}
                      onSave={(data) => updateProductMutation.mutate({ data })}
                      onCancel={() => setIsEditing(false)}
                      isLoading={updateProductMutation.isPending}
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                          <div className="mt-1">
                            <Badge className={getCategoryColor(product.category)}>
                              {product.category}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Base Price</Label>
                          <div className="mt-1 text-lg font-semibold">
                            ${product.basePrice.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <div className="mt-1">
                            <Badge variant={product.isActive ? 'default' : 'secondary'}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                          <div className="mt-1 text-sm">
                            {formatDistance(new Date(product.createdAt), new Date(), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      {product.description && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                            <p className="mt-1 text-sm">{product.description}</p>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold">{totalVariants}</div>
                        <div className="text-xs text-muted-foreground">Total Variants</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Palette className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">{activeVariants}</div>
                        <div className="text-xs text-muted-foreground">In Stock</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="text-2xl font-bold">{totalStock}</div>
                        <div className="text-xs text-muted-foreground">Total Units</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="variants" className="space-y-4">
              <TabsList>
                <TabsTrigger value="variants">Variants</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="orders">Order History</TabsTrigger>
              </TabsList>

              <TabsContent value="variants" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Product Variants</h3>
                  <ProductVariantForm productId={product.id}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variant
                    </Button>
                  </ProductVariantForm>
                </div>
                <ProductVariantList variants={product.variants} />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <ProductAnalytics productId={product.id} />
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <ProductOrderHistory productId={product.id} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}

function ProductEditForm({ 
  product, 
  onSave, 
  onCancel, 
  isLoading 
}: { 
  product: any
  onSave: (data: any) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description || '',
    basePrice: product.basePrice,
    isActive: product.isActive
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Product Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="basePrice">Base Price</Label>
        <Input
          id="basePrice"
          type="number"
          step="0.01"
          value={formData.basePrice}
          onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

function ProductOrderHistory({ productId }: { productId: string }) {
  const { data: orderHistory = [], isLoading } = useQuery({
    queryKey: ['product-order-history', productId],
    queryFn: () => getProductOrderHistory(productId),
  })

  if (isLoading) {
    return <div>Loading order history...</div>
  }

  return (
    <div className="space-y-4">
      {orderHistory.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground">
              This product hasn't been ordered yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orderHistory.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.client.name} • {order.totalQuantity} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${order.totalAmount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}