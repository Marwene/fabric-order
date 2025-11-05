'use client'

import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getShippingPackages } from '@/lib/actions/shipping'
import { PackageForm } from '@/components/shipping/package-form'
import { LabelPreview } from '@/components/shipping/label-preview'
import { getOrders } from '@/lib/actions/orders'
import { PackageWithDetails } from '@/lib/types'
import { formatDistance } from 'date-fns'
import { Package, Truck, Printer, Plus } from 'lucide-react'
export default function ShippingPage() {
  const { data: packages = [], isLoading } = useQuery<PackageWithDetails[]>({
    queryKey: ['shipping-packages'],
    queryFn: getShippingPackages,
  })

  const { data: completedOrders = [] } = useQuery({
    queryKey: ['completed-orders'],
    queryFn: async () => {
      const orders = await getOrders()
      return orders.filter((order: any) => order.status === 'COMPLETED')
    },
  })

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Shipping</h1>
                <p className="text-muted-foreground">
                  Manage packages and shipping labels
                </p>
              </div>
              <PackageForm orders={completedOrders}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Package
              </Button>
              </PackageForm>
            </div>

            {isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : packages.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No packages created</h3>
                  <p className="text-muted-foreground">
                    Create packages from completed orders to generate shipping labels.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {packages.map((pkg: PackageWithDetails) => {
                  const hasLabel = pkg.shippingLabels.length > 0
                  const labelPrinted = hasLabel && pkg.shippingLabels[0].printedAt
                  
                  return (
                    <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {pkg.order.orderNumber} - Package {pkg.packageNumber}
                            </CardTitle>
                            <CardDescription>
                              {pkg.order.client.name}
                              {pkg.weight && ` • ${pkg.weight} lbs`}
                              {pkg.dimensions && ` • ${pkg.dimensions}`}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {labelPrinted ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Printer className="h-3 w-3 mr-1" />
                                Printed
                              </Badge>
                            ) : hasLabel ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                Ready to Print
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                No Label
                              </Badge>
                            )}
                            {pkg.trackingNumber && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <Truck className="h-3 w-3 mr-1" />
                                Shipped
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Created {formatDistance(new Date(pkg.createdAt), new Date(), { addSuffix: true })}
                          </span>
                          {pkg.trackingNumber && (
                            <span className="text-sm font-mono">
                              {pkg.trackingNumber}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          {!hasLabel && (
                            <LabelPreview package={pkg}>
                              <Button variant="outline" size="sm">
                                Generate Label
                              </Button>
                            </LabelPreview>
                          )}
                          {hasLabel && !labelPrinted && (
                            <LabelPreview package={pkg}>
                              <Button variant="outline" size="sm">
                                <Printer className="h-4 w-4 mr-2" />
                                Print Label
                              </Button>
                            </LabelPreview>
                          )}
                          {hasLabel && (
                            <LabelPreview package={pkg}>
                              <Button variant="outline" size="sm">
                                Preview Label
                              </Button>
                            </LabelPreview>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}