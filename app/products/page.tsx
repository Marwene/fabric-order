'use client'

import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getProducts } from '@/lib/actions/products'
import { ProductForm } from '@/components/products/product-form'
import { Plus, Package, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProductsPage() {
  const router = useRouter()
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  const handleViewDetails = (productId: string) => {
    router.push(`/products/${productId}`)
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                <p className="text-muted-foreground">
                  Manage your product catalog and variants
                </p>
              </div>
              <ProductForm>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Product
                </Button>
              </ProductForm>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No products found</h3>
                  <p className="text-muted-foreground">
                    Get started by creating your first product.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <CardDescription>
                            ${product.basePrice.toFixed(2)} base price
                          </CardDescription>
                        </div>
                        <Badge className={getCategoryColor(product.category)}>
                          {product.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {product.description && (
                        <p className="text-sm text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {product.variants.length} variants
                        </span>
                        <div className="flex gap-2">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleViewDetails(product.id)}
                           >
                             <Eye className="h-4 w-4 mr-2" />
                             View Details
                           </Button>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}