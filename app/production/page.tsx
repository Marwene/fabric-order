'use client'

import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getProductionOrders } from '@/lib/actions/production'
import { formatDistance } from 'date-fns'
import { Factory, Clock } from 'lucide-react'
import { ProductionUpdateForm } from '@/components/production/production-update-form'

export default function ProductionPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['production-orders'],
    queryFn: getProductionOrders,
  })

  const getOrderProgress = (order: any) => {
    const totalItems = order.orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0)
    const producedItems = order.orderItems.reduce((sum: number, item: any) => sum + item.producedQty, 0)
    return totalItems > 0 ? (producedItems / totalItems) * 100 : 0
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
                <h1 className="text-3xl font-bold tracking-tight">Production</h1>
                <p className="text-muted-foreground">
                  Track daily production progress and updates
                </p>
              </div>
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
            ) : orders.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Factory className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active production orders</h3>
                  <p className="text-muted-foreground">
                    All orders are either pending or completed.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {orders.map((order) => {
                  const progress = getOrderProgress(order)
                  const isOverdue = order.dueDate && new Date(order.dueDate) < new Date()
                  
                  return (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                            <CardDescription>
                              {order.client.name} • Due{' '}
                              {order.dueDate 
                                ? formatDistance(new Date(order.dueDate), new Date(), { addSuffix: true })
                                : 'No due date'
                              }
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOverdue && (
                              <Badge variant="destructive">
                                <Clock className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                            <Badge variant={order.status === 'PENDING' ? 'secondary' : 'default'}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Production Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          {order.orderItems.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                              <span>
                                {item.variant.product.name} ({item.variant.size} {item.variant.color})
                              </span>
                              <span>
                                {item.producedQty} / {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {order.productionUpdates.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Last update: {formatDistance(
                                new Date(order.productionUpdates[0].createdAt),
                                new Date(),
                                { addSuffix: true }
                              )}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          <ProductionUpdateForm order={order}>
                            <Button variant="outline" size="sm">
                              Update Progress
                            </Button>
                          </ProductionUpdateForm>
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