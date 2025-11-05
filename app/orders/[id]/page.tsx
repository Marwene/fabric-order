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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getOrder, updateOrderStatus, deleteOrder } from '@/lib/actions/orders'
import { createDefaultPackagesForOrder } from '@/lib/actions/shipping'
import { ProductionUpdateForm } from '@/components/production/production-update-form'
import { OrderStatusTracker } from '@/components/orders/order-status-tracker'
import { formatDistance } from 'date-fns'
import { ArrowLeft, Package, Truck, Calendar, DollarSign, User, Factory, Trash2, CreditCard as Edit } from 'lucide-react'

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const orderId = params.id as string

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) => updateOrderStatus(orderId, status),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Order status updated successfully')
        queryClient.invalidateQueries({ queryKey: ['order', orderId] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      } else {
        toast.error(result.error || 'Failed to update order status')
      }
    },
  })

  const deleteOrderMutation = useMutation({
    mutationFn: () => deleteOrder(orderId),
    onSuccess: () => {
      toast.success('Order deleted successfully')
      router.push('/orders')
    },
    onError: () => {
      toast.error('Failed to delete order')
    },
  })

  const createPackagesMutation = useMutation({
    mutationFn: () => createDefaultPackagesForOrder(orderId),
    onSuccess: (result) => {
      if (result.success && 'packages' in result) {
        toast.success(`${result.packages?.length || 0} packages created successfully`)
        queryClient.invalidateQueries({ queryKey: ['order', orderId] })
        queryClient.invalidateQueries({ queryKey: ['shipping-packages'] })
      } else {
        toast.error(result.error || 'Failed to create packages')
      }
    },
    onError: () => {
      toast.error('Failed to create packages')
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

  if (!order) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The order you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push('/orders')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'DELIVERED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getOrderProgress = () => {
    const totalItems = order.orderItems.reduce((sum: any, item: { quantity: any }) => sum + item.quantity, 0)
    const producedItems = order.orderItems.reduce((sum: any, item: { producedQty: any }) => sum + item.producedQty, 0)
    return totalItems > 0 ? (producedItems / totalItems) * 100 : 0
  }

  const progress = getOrderProgress()

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
                <Button variant="ghost" onClick={() => router.push('/orders')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{order.orderNumber}</h1>
                  <p className="text-muted-foreground">
                    Order details and production tracking
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={order.status}
                  onValueChange={(status) => updateStatusMutation.mutate({ status })}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => deleteOrderMutation.mutate()}
                  disabled={deleteOrderMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Order Summary */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{order.client.name}</div>
                        <div className="text-xs text-muted-foreground">Client</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">${order.totalAmount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {order.dueDate 
                            ? new Date(order.dueDate).toLocaleDateString()
                            : 'No due date'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">Due Date</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Production Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Production Progress</h3>
                      <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-medium mb-3">Order Items</h3>
                    <div className="space-y-3">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{item.variant.product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.variant.size} {item.variant.color} ({item.variant.fabricType})
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${item.totalPrice.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.producedQty} / {item.quantity} produced
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.notes && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">Notes</h3>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Actions & Info */}
              <div className="space-y-4">
                {/* Order Status Tracker */}
                <OrderStatusTracker order={order} />

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
                      <ProductionUpdateForm order={order}>
                        <Button className="w-full">
                          <Factory className="h-4 w-4 mr-2" />
                          Update Production
                        </Button>
                      </ProductionUpdateForm>
                    )}
                    {order.status === 'COMPLETED' && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => createPackagesMutation.mutate()}
                        disabled={createPackagesMutation.isPending}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {createPackagesMutation.isPending ? 'Creating...' : 'Create Default Packages'}
                      </Button>
                    )}
                    {order.packages.length > 0 && (
                      <Button className="w-full" variant="outline">
                        <Truck className="h-4 w-4 mr-2" />
                        View Shipping
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Order Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div>
                          <div className="text-sm font-medium">Order Created</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      {order.productionUpdates.map((update) => (
                        <div key={update.id} className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <div>
                            <div className="text-sm font-medium">Production Update</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistance(new Date(update.createdAt), new Date(), { addSuffix: true })}
                            </div>
                            {update.notes && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {update.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Packages */}
                {order.packages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Packages ({order.packages.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.packages.map((pkg) => (
                          <div key={pkg.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="text-sm font-medium">Package {pkg.packageNumber}</div>
                              {pkg.weight && (
                                <div className="text-xs text-muted-foreground">{pkg.weight} lbs</div>
                              )}
                            </div>
                            <Badge variant={pkg.shippingLabels.length > 0 ? 'default' : 'secondary'}>
                              {pkg.shippingLabels.length > 0 ? 'Labeled' : 'No Label'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}