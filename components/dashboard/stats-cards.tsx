'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardStats } from '@/lib/actions/production'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingCart, Clock, CircleCheck as CheckCircle, Users, DollarSign, Package } from 'lucide-react'

export function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      description: 'All time orders',
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      description: 'Awaiting production',
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'In Progress',
      value: stats.inProgressOrders,
      description: 'Currently in production',
      icon: Package,
      color: 'text-orange-600',
    },
    {
      title: 'Completed',
      value: stats.completedOrders,
      description: 'Ready for shipping',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      description: 'All time revenue',
      icon: DollarSign,
      color: 'text-purple-600',
    },
    {
      title: 'Total Clients',
      value: stats.totalClients,
      description: 'Active clients',
      icon: Users,
      color: 'text-indigo-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}