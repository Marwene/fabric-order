'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getClient } from '@/lib/actions/clients'
import { formatDistance } from 'date-fns'
import { ArrowLeft, Mail, Phone, MapPin, Building, Calendar, DollarSign, ShoppingCart, CreditCard as Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
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

  if (!client) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">Client Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The client you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push('/clients')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
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

  const totalOrders = client.orders.length
  const totalValue = client.orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const activeOrders = client.orders.filter(order => 
    ['PENDING', 'IN_PROGRESS'].includes(order.status)
  ).length

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
                <Button variant="ghost" onClick={() => router.push('/clients')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Clients
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
                  <p className="text-muted-foreground">
                    {client.company || 'Individual Client'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Client
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Client Information */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="font-medium mb-3">Contact Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{client.email}</div>
                          <div className="text-xs text-muted-foreground">Email</div>
                        </div>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{client.phone}</div>
                            <div className="text-xs text-muted-foreground">Phone</div>
                          </div>
                        </div>
                      )}
                      {client.company && (
                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{client.company}</div>
                            <div className="text-xs text-muted-foreground">Company</div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            {formatDistance(new Date(client.createdAt), new Date(), { addSuffix: true })}
                          </div>
                          <div className="text-xs text-muted-foreground">Client since</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  {(client.address || client.city || client.state) && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-3">Address</h3>
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="text-sm">
                            {client.address && <div>{client.address}</div>}
                            {(client.city || client.state || client.zipCode) && (
                              <div>
                                {client.city}{client.city && client.state && ', '}{client.state} {client.zipCode}
                              </div>
                            )}
                            {client.country && client.country !== 'US' && (
                              <div>{client.country}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {client.notes && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">Notes</h3>
                        <p className="text-sm text-muted-foreground">{client.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold">{totalOrders}</div>
                        <div className="text-xs text-muted-foreground">Total Orders</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Value</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="text-2xl font-bold">{activeOrders}</div>
                        <div className="text-xs text-muted-foreground">Active Orders</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Order History */}
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>
                  All orders placed by this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {client.orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                    <p className="text-muted-foreground">
                      This client hasn't placed any orders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {client.orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div>
                            <Link 
                              href={`/orders/${order.id}`}
                              className="font-medium hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                            <div className="text-sm text-muted-foreground">
                              {order.orderItems.length} items • Created {formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">${order.totalAmount.toLocaleString()}</div>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}