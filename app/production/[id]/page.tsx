'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getOrder } from '@/lib/actions/orders'
import { ProductionUpdateForm } from '@/components/production/production-update-form'
import { ProductionTimeline } from '@/components/production/production-timeline'
import { ProductionMetrics } from '@/components/production/production-metrics'
import { QualityControl } from '@/components/production/quality-control'
import { formatDistance } from 'date-fns'
import { ArrowLeft, Factory, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Users, Target } from 'lucide-react'

export default function ProductionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const { data: order, isLoading } = useQuery({
    queryKey: ['production-order', orderId],
    queryFn: () => getOrder(orderId),
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

  if (!order) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">Production Order Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The production order you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push('/production')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Production
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const getOrderProgress = () => {
    const totalItems = order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
    const producedItems = order.orderItems.reduce((sum, item) => sum + item.producedQty, 0)
    return totalItems > 0 ? (producedItems / totalItems) * 100 : 0
  }

  const progress = getOrderProgress()
  const isOverdue = order.dueDate && new Date(order.dueDate) < new Date()
  const totalItems = order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
  const producedItems = order.orderItems.reduce((sum, item) => sum + item.producedQty, 0)
  const remainingItems = totalItems - producedItems

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
                <Button variant="ghost" onClick={() => router.push('/production')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Production
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Production: {order.orderNumber}</h1>
                  <p className="text-muted-foreground">
                    Detailed production tracking and management
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOverdue && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
                <Badge variant={order.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {order.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Production Overview */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{totalItems}</div>
                      <div className="text-xs text-muted-foreground">Total Items</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{producedItems}</div>
                      <div className="text-xs text-muted-foreground">Produced</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold">{remainingItems}</div>
                      <div className="text-xs text-muted-foreground">Remaining</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{Math.round(progress)}%</div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Production Details */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Production Details</CardTitle>
                    <ProductionUpdateForm order={order}>
                      <Button>
                        <Factory className="h-4 w-4 mr-2" />
                        Update Progress
                      </Button>
                    </ProductionUpdateForm>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  <Separator />

                  {/* Item Details */}
                  <div>
                    <h3 className="font-medium mb-4">Production Items</h3>
                    <div className="space-y-4">
                      {order.orderItems.map((item) => {
                        const itemProgress = item.quantity > 0 ? (item.producedQty / item.quantity) * 100 : 0
                        const isItemComplete = item.producedQty >= item.quantity
                        
                        return (
                          <div key={item.id} className="space-y-3 p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{item.variant.product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.variant.size} {item.variant.color} ({item.variant.fabricType})
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {item.producedQty} / {item.quantity}
                                  </span>
                                  {isItemComplete && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ${item.totalPrice.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{Math.round(itemProgress)}%</span>
                              </div>
                              <Progress value={itemProgress} className="h-1" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Information */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Client</Label>
                      <div className="mt-1 font-medium">{order.client.name}</div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Order Value</Label>
                      <div className="mt-1 font-medium">${order.totalAmount.toLocaleString()}</div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                      <div className="mt-1">
                        {order.dueDate ? (
                          <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(order.dueDate).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {formatDistance(new Date(order.dueDate), new Date(), { addSuffix: true })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No due date</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                      <div className="mt-1 text-sm">
                        {formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true })}
                      </div>
                    </div>

                    {order.notes && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                        <div className="mt-1 text-sm">{order.notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="timeline" className="space-y-4">
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="quality">Quality Control</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <ProductionTimeline order={order} />
              </TabsContent>

              <TabsContent value="metrics">
                <ProductionMetrics orderId={order.id} />
              </TabsContent>

              <TabsContent value="quality">
                <QualityControl orderId={order.id} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={className}>{children}</div>
}