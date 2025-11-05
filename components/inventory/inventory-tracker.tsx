'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getInventoryStatus } from '@/lib/actions/inventory'
import { TriangleAlert as AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react'

export function InventoryTracker() {
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory-status'],
    queryFn: getInventoryStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!inventory) return null

  const getStockLevel = (current: number, reserved: number, reorderPoint: number) => {
    const available = current - reserved
    if (available <= 0) return 'out'
    if (available <= reorderPoint) return 'low'
    if (available <= reorderPoint * 2) return 'medium'
    return 'high'
  }

  const getStockColor = (level: string) => {
    switch (level) {
      case 'out': return 'text-red-600 bg-red-50'
      case 'low': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const lowStockItems = inventory.variants.filter(variant => {
    const level = getStockLevel(variant.stockQty, variant.reservedQty, variant.reorderPoint)
    return level === 'low' || level === 'out'
  })

  return (
    <div className="space-y-4">
      {/* Inventory Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{inventory.totalVariants}</div>
                <div className="text-xs text-muted-foreground">Total SKUs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{inventory.totalStock}</div>
                <div className="text-xs text-muted-foreground">Total Units</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{inventory.reservedStock}</div>
                <div className="text-xs text-muted-foreground">Reserved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{lowStockItems.length}</div>
                <div className="text-xs text-muted-foreground">Low Stock</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Items that need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((variant) => {
                const level = getStockLevel(variant.stockQty, variant.reservedQty, variant.reorderPoint)
                const available = variant.stockQty - variant.reservedQty
                
                return (
                  <div key={variant.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {variant.product.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {variant.size} {variant.color} ({variant.fabricType}) • SKU: {variant.sku}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div>Available: {available}</div>
                        <div className="text-muted-foreground">Reserved: {variant.reservedQty}</div>
                      </div>
                      <Badge className={getStockColor(level)}>
                        {level.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Details</CardTitle>
          <CardDescription>
            Current stock levels for all product variants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inventory.variants.map((variant) => {
              const level = getStockLevel(variant.stockQty, variant.reservedQty, variant.reorderPoint)
              const available = variant.stockQty - variant.reservedQty
              const utilizationPercent = variant.stockQty > 0 ? (variant.reservedQty / variant.stockQty) * 100 : 0
              
              return (
                <div key={variant.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {variant.product.name} - {variant.size} {variant.color}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {variant.fabricType} • SKU: {variant.sku}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div>Stock: {variant.stockQty}</div>
                        <div>Available: {available}</div>
                        <div className="text-muted-foreground">Reserved: {variant.reservedQty}</div>
                      </div>
                      <Badge className={getStockColor(level)}>
                        {level.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  {variant.reservedQty > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Utilization</span>
                        <span>{Math.round(utilizationPercent)}%</span>
                      </div>
                      <Progress value={utilizationPercent} className="h-1" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}