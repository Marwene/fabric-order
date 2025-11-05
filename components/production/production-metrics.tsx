'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import { getProductionMetrics } from '@/lib/actions/production'
import { Clock, TrendingUp, Target, Zap } from 'lucide-react'

interface ProductionMetricsProps {
  orderId: string
}

export function ProductionMetrics({ orderId }: ProductionMetricsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['production-metrics', orderId],
    queryFn: () => getProductionMetrics(orderId),
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{metrics.daysInProduction}</div>
                <div className="text-xs text-muted-foreground">Days in Production</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{metrics.avgDailyProduction.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Daily Production</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{metrics.efficiency.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Efficiency</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{metrics.estimatedCompletion}</div>
                <div className="text-xs text-muted-foreground">Est. Days to Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Production */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Production</CardTitle>
            <CardDescription>Items produced per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.dailyProduction}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="produced" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cumulative Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Progress</CardTitle>
            <CardDescription>Total items produced over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics.cumulativeProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Item Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Item Progress</CardTitle>
            <CardDescription>Progress by product variant</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.itemProgress} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="item" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="produced" fill="#f59e0b" />
                <Bar dataKey="remaining" fill="#e5e7eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Production Velocity */}
        <Card>
          <CardHeader>
            <CardTitle>Production Velocity</CardTitle>
            <CardDescription>Production rate trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.velocityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="velocity" stroke="#7c3aed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}