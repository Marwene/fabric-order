'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistance } from 'date-fns'
import { Clock, Factory, CircleCheck as CheckCircle, User, FileText } from 'lucide-react'
import type { OrderWithDetails } from '@/lib/types'

interface ProductionTimelineProps {
  order: OrderWithDetails
}

interface TimelineEvent {
  id: string
  type: string
  title: string
  description: string
  timestamp: Date
  icon: React.ComponentType<any>
  color: string
  details?: any
}

export function ProductionTimeline({ order }: ProductionTimelineProps) {
  const timelineEvents: TimelineEvent[] = [
    {
      id: 'created',
      type: 'order_created',
      title: 'Order Created',
      description: `Order ${order.orderNumber} was created`,
      timestamp: order.createdAt,
      icon: Clock,
      color: 'text-blue-600',
    },
    ...order.productionUpdates.map(update => ({
      id: update.id,
      type: 'production_update',
      title: 'Production Update',
      description: update.notes || 'Production progress updated',
      timestamp: update.createdAt,
      icon: Factory,
      color: 'text-green-600',
      details: update.itemsProduced,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Timeline</CardTitle>
        <CardDescription>
          Complete history of production activities for this order
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {timelineEvents.map((event, index) => {
            const Icon = event.icon
            const isLast = index === timelineEvents.length - 1
            
            return (
              <div key={event.id} className="relative">
                {!isLast && (
                  <div className="absolute left-4 top-8 h-full w-px bg-border" />
                )}
                
                <div className="flex items-start gap-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background ${event.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{event.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatDistance(new Date(event.timestamp), new Date(), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                    
                    {event.details && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <h4 className="text-sm font-medium mb-2">Items Produced:</h4>
                        <div className="space-y-1">
                          {Object.entries(event.details as Record<string, number>).map(([variantId, quantity]) => {
                            const item = order.orderItems.find(item => item.variantId === variantId)
                            if (!item || quantity === 0) return null
                            
                            return (
                              <div key={variantId} className="flex justify-between text-sm">
                                <span>
                                  {item.variant.product.name} ({item.variant.size} {item.variant.color})
                                </span>
                                <span className="font-medium">+{quantity}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          
          {timelineEvents.length === 1 && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No production updates yet</h3>
              <p className="text-muted-foreground">
                Production updates will appear here as work progresses.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}