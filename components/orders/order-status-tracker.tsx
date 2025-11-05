'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { formatDistance } from 'date-fns'
import { Clock, Factory, CircleCheck as CheckCircle, Truck, Package, TriangleAlert as AlertTriangle, Calendar } from 'lucide-react'
import type { OrderWithDetails } from '@/lib/types'

interface OrderStatusTrackerProps {
  order: OrderWithDetails
}

const ORDER_STAGES = [
  { key: 'PENDING', label: 'Order Placed', icon: Clock, color: 'text-yellow-600' },
  { key: 'IN_PROGRESS', label: 'In Production', icon: Factory, color: 'text-blue-600' },
  { key: 'COMPLETED', label: 'Production Complete', icon: CheckCircle, color: 'text-green-600' },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck, color: 'text-purple-600' },
  { key: 'DELIVERED', label: 'Delivered', icon: Package, color: 'text-gray-600' },
]

export function OrderStatusTracker({ order }: OrderStatusTrackerProps) {
  const currentStageIndex = ORDER_STAGES.findIndex(stage => stage.key === order.status)
  const progress = currentStageIndex >= 0 ? ((currentStageIndex + 1) / ORDER_STAGES.length) * 100 : 0
  
  const isOverdue = order.dueDate && new Date(order.dueDate) < new Date() && order.status !== 'DELIVERED'
  
  const getProductionProgress = () => {
    const totalItems = order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
    const producedItems = order.orderItems.reduce((sum, item) => sum + item.producedQty, 0)
    return totalItems > 0 ? (producedItems / totalItems) * 100 : 0
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Order Status Tracker
            {isOverdue && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            )}
          </CardTitle>
          {order.dueDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Due {formatDistance(new Date(order.dueDate), new Date(), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Status Timeline */}
        <div className="space-y-4">
          {ORDER_STAGES.map((stage, index) => {
            const isCompleted = index <= currentStageIndex
            const isCurrent = index === currentStageIndex
            const StageIcon = stage.icon

            return (
              <div key={stage.key} className="flex items-center gap-4">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                  ${isCompleted 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : isCurrent
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }
                `}>
                  <StageIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {stage.label}
                  </div>
                  {isCurrent && (
                    <div className="text-sm text-muted-foreground">
                      Current status
                    </div>
                  )}
                </div>
                {isCompleted && (
                  <div className="text-xs text-muted-foreground">
                    ✓ Complete
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Production Details */}
        {(order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Production Progress</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Items Produced</span>
                    <span>{Math.round(getProductionProgress())}%</span>
                  </div>
                  <Progress value={getProductionProgress()} className="h-1" />
                </div>
                
                <div className="space-y-2">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {item.variant.product.name} ({item.variant.size} {item.variant.color})
                      </span>
                      <span className={item.producedQty >= item.quantity ? 'text-green-600' : 'text-muted-foreground'}>
                        {item.producedQty} / {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Shipping Details */}
        {order.packages.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Shipping Information</h4>
              <div className="space-y-2">
                {order.packages.map((pkg) => (
                  <div key={pkg.id} className="flex justify-between items-center text-sm">
                    <span>Package {pkg.packageNumber}</span>
                    <div className="flex items-center gap-2">
                      {pkg.trackingNumber && (
                        <span className="font-mono text-xs">{pkg.trackingNumber}</span>
                      )}
                      <Badge variant={pkg.shippingLabels.length > 0 ? 'default' : 'secondary'}>
                        {pkg.shippingLabels.length > 0 ? 'Labeled' : 'No Label'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recent Updates */}
        {order.productionUpdates.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Recent Updates</h4>
              <div className="space-y-2">
                {order.productionUpdates.slice(0, 3).map((update) => (
                  <div key={update.id} className="text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground">
                        Production update
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistance(new Date(update.createdAt), new Date(), { addSuffix: true })}
                      </span>
                    </div>
                    {update.notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {update.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}